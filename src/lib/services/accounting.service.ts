import { prisma } from '../prisma';
import { CryptoCurrency, FiatCurrency, OrderStatus, OrderType, AccountingPeriodType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const VAT_RATE = new Decimal('0.17'); // ישראל 17%

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PnLSummary {
  periodLabel: string;
  startDate: Date;
  endDate: Date;
  totalOrders: number;
  grossRevenueIls: number;       // sum of fiatAmount for all completed orders
  spreadRevenueIls: number;      // sum of feeAmount (our profit from spread)
  vatOnRevenueIls: number;       // 17% of spreadRevenueIls
  vatPayableIls: number;         // vatOnRevenue - inputVat
  realizedGainIls: number;       // total realized capital gain (from sell orders)
  realizedLossIls: number;       // total realized capital loss
  netRealizedIls: number;        // gain - loss
  unrealizedByAsset: UnrealizedPosition[];
  byAsset: AssetBreakdown[];
}

export interface UnrealizedPosition {
  asset: CryptoCurrency;
  inventoryAmount: number;       // total crypto still held
  avgCostPerUnit: number;
  currentPriceIls: number;       // latest price snapshot
  currentValueIls: number;
  costBasisIls: number;
  unrealizedGainLossIls: number; // positive = unrealized gain, negative = unrealized loss
}

export interface AssetBreakdown {
  asset: CryptoCurrency;
  buyOrders: number;
  sellOrders: number;
  totalBoughtIls: number;
  totalSoldIls: number;
  totalSpreadIls: number;
}

export interface AccountantExportRow {
  date: string;
  orderId: string;
  type: string;
  asset: string;
  cryptoAmount: number;
  rateIls: number;
  fiatAmountIls: number;
  feeIls: number;
  spreadPct: number;
  vatIls: number;
  realizedGainLoss: number | null;
  customer: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class AccountingService {

  // Returns or creates the open accounting period containing today
  async getCurrentPeriod() {
    const now = new Date();
    const existing = await prisma.accountingPeriod.findFirst({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
        status: 'open',
      },
      include: { vatReport: true },
    });
    if (existing) return existing;

    // Auto-create bimonthly period aligned to Israeli VAT cycles (Jan-Feb, Mar-Apr, ...)
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const periodIndex = Math.floor(month / 2);
    const startMonth = periodIndex * 2;
    const startDate = new Date(year, startMonth, 1);
    const endDate = new Date(year, startMonth + 2, 0, 23, 59, 59, 999);
    const startLabel = String(startMonth + 1).padStart(2, '0');
    const endLabel = String(startMonth + 2).padStart(2, '0');
    const label = `${startLabel}/${year} – ${endLabel}/${year}`;

    return prisma.accountingPeriod.create({
      data: { type: AccountingPeriodType.bimonthly, startDate, endDate, label },
      include: { vatReport: true },
    });
  }

  async getPeriods(limit = 12) {
    return prisma.accountingPeriod.findMany({
      orderBy: { startDate: 'desc' },
      take: limit,
      include: { vatReport: true },
    });
  }

  // ── VAT Report ─────────────────────────────────────────────────────────────

  async generateVatReport(periodId: string, adminId: string) {
    const period = await prisma.accountingPeriod.findUniqueOrThrow({
      where: { id: periodId },
    });

    const orders = await prisma.order.findMany({
      where: {
        status: OrderStatus.completed,
        completedAt: { gte: period.startDate, lte: period.endDate },
      },
    });

    const grossRevenueIls = orders.reduce((s, o) => s.add(o.fiatAmount), new Decimal(0));
    const spreadRevenueIls = orders.reduce((s, o) => s.add(o.feeAmount), new Decimal(0));
    const vatOnRevenueIls = spreadRevenueIls.mul(VAT_RATE).toDecimalPlaces(2);
    const vatPayableIls = vatOnRevenueIls; // no tracked input VAT yet

    const buyOrders = orders.filter(o => o.type === OrderType.buy).length;
    const sellOrders = orders.filter(o => o.type === OrderType.sell).length;

    return prisma.vatReport.upsert({
      where: { periodId },
      create: {
        periodId,
        grossRevenueIls,
        spreadRevenueIls,
        vatOnRevenueIls,
        vatPayableIls,
        totalOrders: orders.length,
        buyOrders,
        sellOrders,
        generatedBy: adminId,
      },
      update: {
        grossRevenueIls,
        spreadRevenueIls,
        vatOnRevenueIls,
        vatPayableIls,
        totalOrders: orders.length,
        buyOrders,
        sellOrders,
        generatedAt: new Date(),
        generatedBy: adminId,
      },
    });
  }

  // ── FIFO Inventory & Realized P&L ─────────────────────────────────────────

  async processCompletedBuyOrder(orderId: string) {
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    if (order.type !== OrderType.buy || order.status !== OrderStatus.completed) return null;

    const existing = await prisma.cryptoInventoryLot.findUnique({ where: { orderId } });
    if (existing) return existing;

    return prisma.cryptoInventoryLot.create({
      data: {
        asset: order.asset,
        orderId,
        cryptoAmount: order.cryptoAmount,
        costBasisIls: order.fiatAmount,
        costPerUnit: new Decimal(order.fiatAmount).div(order.cryptoAmount).toDecimalPlaces(8),
        remainingAmount: order.cryptoAmount,
        acquiredAt: order.completedAt ?? order.updatedAt,
      },
    });
  }

  async processCompletedSellOrder(orderId: string) {
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    if (order.type !== OrderType.sell || order.status !== OrderStatus.completed) return null;

    const existing = await prisma.realizedGainRecord.findUnique({ where: { orderId } });
    if (existing) return existing;

    // FIFO: consume oldest lots first
    let remaining = new Decimal(order.cryptoAmount);
    const proceeds = new Decimal(order.fiatAmount);
    let totalCost = new Decimal(0);
    const lotsUsed: { lotId: string; amount: string; cost: string }[] = [];

    const lots = await prisma.cryptoInventoryLot.findMany({
      where: { asset: order.asset, remainingAmount: { gt: 0 } },
      orderBy: { acquiredAt: 'asc' },
    });

    for (const lot of lots) {
      if (remaining.lte(0)) break;
      const lotAvail = new Decimal(lot.remainingAmount);
      const take = remaining.lt(lotAvail) ? remaining : lotAvail;
      const cost = take.mul(lot.costPerUnit).toDecimalPlaces(2);
      totalCost = totalCost.add(cost);
      lotsUsed.push({ lotId: lot.id, amount: take.toString(), cost: cost.toString() });
      remaining = remaining.sub(take);

      await prisma.cryptoInventoryLot.update({
        where: { id: lot.id },
        data: { remainingAmount: lotAvail.sub(take).toDecimalPlaces(8) },
      });
    }

    const gainLossIls = proceeds.sub(totalCost).toDecimalPlaces(2);

    return prisma.realizedGainRecord.create({
      data: {
        orderId,
        asset: order.asset,
        cryptoSold: order.cryptoAmount,
        proceedsIls: proceeds,
        costBasisIls: totalCost,
        gainLossIls,
        isGain: gainLossIls.gte(0),
        lots: JSON.stringify(lotsUsed),
        realizedAt: order.completedAt ?? order.updatedAt,
      },
    });
  }

  // ── Unrealized Gains ───────────────────────────────────────────────────────

  async getUnrealizedPositions(): Promise<UnrealizedPosition[]> {
    const lots = await prisma.cryptoInventoryLot.findMany({
      where: { remainingAmount: { gt: 0 } },
    });

    // Group by asset
    const byAsset = new Map<CryptoCurrency, { totalAmount: Decimal; totalCost: Decimal }>();
    for (const lot of lots) {
      const cur = byAsset.get(lot.asset) ?? { totalAmount: new Decimal(0), totalCost: new Decimal(0) };
      byAsset.set(lot.asset, {
        totalAmount: cur.totalAmount.add(lot.remainingAmount),
        totalCost: cur.totalCost.add(new Decimal(lot.remainingAmount).mul(lot.costPerUnit)),
      });
    }

    const positions: UnrealizedPosition[] = [];

    for (const [asset, pos] of Array.from(byAsset.entries())) {
      // Get the latest price snapshot
      const snapshot = await prisma.priceSnapshot.findFirst({
        where: { asset, fiatCurrency: FiatCurrency.ILS },
        orderBy: { snapshotAt: 'desc' },
      });

      const currentPrice = snapshot ? new Decimal(snapshot.priceIls) : new Decimal(0);
      const currentValue = pos.totalAmount.mul(currentPrice).toDecimalPlaces(2);
      const unrealized = currentValue.sub(pos.totalCost).toDecimalPlaces(2);
      const avgCost = pos.totalAmount.gt(0)
        ? pos.totalCost.div(pos.totalAmount).toDecimalPlaces(8)
        : new Decimal(0);

      positions.push({
        asset,
        inventoryAmount: pos.totalAmount.toNumber(),
        avgCostPerUnit: avgCost.toNumber(),
        currentPriceIls: currentPrice.toNumber(),
        currentValueIls: currentValue.toNumber(),
        costBasisIls: pos.totalCost.toDecimalPlaces(2).toNumber(),
        unrealizedGainLossIls: unrealized.toNumber(),
      });
    }

    return positions;
  }

  // ── Full P&L Summary ───────────────────────────────────────────────────────

  async getPnLSummary(startDate: Date, endDate: Date): Promise<PnLSummary> {
    const [orders, realizedGains, unrealized] = await Promise.all([
      prisma.order.findMany({
        where: {
          status: OrderStatus.completed,
          completedAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.realizedGainRecord.findMany({
        where: { realizedAt: { gte: startDate, lte: endDate } },
      }),
      this.getUnrealizedPositions(),
    ]);

    const grossRevenue = orders.reduce((s: number, o) => s + Number(o.fiatAmount), 0);
    const spreadRevenue = orders.reduce((s: number, o) => s + Number(o.feeAmount), 0);
    const vatOnRevenue = Math.round(spreadRevenue * 0.17 * 100) / 100;

    const gains = realizedGains.filter(r => r.isGain);
    const losses = realizedGains.filter(r => !r.isGain);
    const realizedGainIls = gains.reduce((s: number, r) => s + Number(r.gainLossIls), 0);
    const realizedLossIls = Math.abs(losses.reduce((s: number, r) => s + Number(r.gainLossIls), 0));

    // Per-asset breakdown
    const assetMap = new Map<CryptoCurrency, AssetBreakdown>();
    for (const order of orders) {
      const cur = assetMap.get(order.asset) ?? {
        asset: order.asset, buyOrders: 0, sellOrders: 0,
        totalBoughtIls: 0, totalSoldIls: 0, totalSpreadIls: 0,
      };
      if (order.type === OrderType.buy) {
        cur.buyOrders++;
        cur.totalBoughtIls += Number(order.fiatAmount);
      } else {
        cur.sellOrders++;
        cur.totalSoldIls += Number(order.fiatAmount);
      }
      cur.totalSpreadIls += Number(order.feeAmount);
      assetMap.set(order.asset, cur);
    }

    const label = `${startDate.toLocaleDateString('he-IL')} – ${endDate.toLocaleDateString('he-IL')}`;

    return {
      periodLabel: label,
      startDate,
      endDate,
      totalOrders: orders.length,
      grossRevenueIls: grossRevenue,
      spreadRevenueIls: spreadRevenue,
      vatOnRevenueIls: vatOnRevenue,
      vatPayableIls: vatOnRevenue,
      realizedGainIls,
      realizedLossIls,
      netRealizedIls: realizedGainIls - realizedLossIls,
      unrealizedByAsset: unrealized,
      byAsset: Array.from(assetMap.values()),
    };
  }

  // ── Accountant Export (CSV-ready rows) ─────────────────────────────────────

  async getAccountantExport(startDate: Date, endDate: Date): Promise<AccountantExportRow[]> {
    const orders = await prisma.order.findMany({
      where: {
        status: OrderStatus.completed,
        completedAt: { gte: startDate, lte: endDate },
      },
      include: { user: { select: { fullName: true, email: true } } },
      orderBy: { completedAt: 'asc' },
    });

    const gainRecords = await prisma.realizedGainRecord.findMany({
      where: { realizedAt: { gte: startDate, lte: endDate } },
    });
    const gainByOrder = new Map(gainRecords.map(g => [g.orderId, g]));

    return orders.map(order => {
      const gain = gainByOrder.get(order.id);
      const feeNum = Number(order.feeAmount);
      return {
        date: (order.completedAt ?? order.updatedAt).toISOString().split('T')[0],
        orderId: order.id,
        type: order.type === OrderType.buy ? 'קנייה' : 'מכירה',
        asset: order.asset,
        cryptoAmount: Number(order.cryptoAmount),
        rateIls: Number(order.rate),
        fiatAmountIls: Number(order.fiatAmount),
        feeIls: feeNum,
        spreadPct: Number(order.spread),
        vatIls: Math.round(feeNum * 0.17 * 100) / 100,
        realizedGainLoss: gain ? Number(gain.gainLossIls) : null,
        customer: `${order.user.fullName} (${order.user.email})`,
      };
    });
  }

  // ── Price Snapshot (called from cron or admin) ─────────────────────────────

  async savePrice(asset: CryptoCurrency, priceIls: number, source = 'manual') {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    return prisma.priceSnapshot.upsert({
      where: {
        asset_fiatCurrency_snapshotAt: {
          asset,
          fiatCurrency: FiatCurrency.ILS,
          snapshotAt: today,
        },
      },
      create: { asset, fiatCurrency: FiatCurrency.ILS, priceIls, source, snapshotAt: today },
      update: { priceIls, source },
    });
  }

  // ── Annual Summary (for year-end accountant filing) ────────────────────────

  async getAnnualSummary(year: number) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    const summary = await this.getPnLSummary(startDate, endDate);

    const vatReports = await prisma.vatReport.findMany({
      where: { period: { startDate: { gte: startDate }, endDate: { lte: endDate } } },
      include: { period: { select: { label: true } } },
    });

    const totalVatPaid = vatReports.reduce((s: number, r) => s + Number(r.vatPayableIls), 0);

    return {
      year,
      ...summary,
      vatBreakdown: vatReports.map(r => ({
        period: r.period.label,
        grossRevenue: Number(r.grossRevenueIls),
        spreadRevenue: Number(r.spreadRevenueIls),
        vatPayable: Number(r.vatPayableIls),
      })),
      totalVatPaidIls: totalVatPaid,
      // Capital gains tax estimate (25% on realized gains in Israel for individuals)
      estimatedCapGainsTaxIls: Math.max(0, summary.netRealizedIls * 0.25),
    };
  }
}

export const accountingService = new AccountingService();
