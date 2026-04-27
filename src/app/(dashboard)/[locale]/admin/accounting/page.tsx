import { getSession, isFinanceOrAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { accountingService } from '@/lib/services/accounting.service';
import type { AccountingPeriod, VatReport, PriceSnapshot } from '@prisma/client';
import AccountingClient from './AccountingClient';

export default async function AccountingPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isFinanceOrAdmin(session)) redirect(`/${locale}/admin`);

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

  const [currentPeriod, periods, annualSummary, unrealized, recentPrices] = await Promise.all([
    accountingService.getCurrentPeriod(),
    accountingService.getPeriods(6),
    accountingService.getAnnualSummary(now.getFullYear()),
    accountingService.getUnrealizedPositions(),
    prisma.priceSnapshot.findMany({
      orderBy: { snapshotAt: 'desc' },
      take: 10,
    }),
  ]);

  // Generate VAT report for current period if not exists
  if (!currentPeriod.vatReport) {
    await accountingService.generateVatReport(currentPeriod.id, session.sub);
  }

  // Serialize for client
  const data = {
    currentPeriod: {
      id: currentPeriod.id,
      label: currentPeriod.label,
      startDate: currentPeriod.startDate.toISOString(),
      endDate: currentPeriod.endDate.toISOString(),
      status: currentPeriod.status,
      vatReport: currentPeriod.vatReport ? {
        grossRevenueIls: Number(currentPeriod.vatReport.grossRevenueIls),
        spreadRevenueIls: Number(currentPeriod.vatReport.spreadRevenueIls),
        vatOnRevenueIls: Number(currentPeriod.vatReport.vatOnRevenueIls),
        vatPayableIls: Number(currentPeriod.vatReport.vatPayableIls),
        totalOrders: currentPeriod.vatReport.totalOrders,
        buyOrders: currentPeriod.vatReport.buyOrders,
        sellOrders: currentPeriod.vatReport.sellOrders,
        generatedAt: currentPeriod.vatReport.generatedAt.toISOString(),
      } : null,
    },
    periods: periods.map((p: AccountingPeriod & { vatReport: VatReport | null }) => ({
      id: p.id,
      label: p.label,
      status: p.status,
      startDate: p.startDate.toISOString(),
      endDate: p.endDate.toISOString(),
      vatReport: p.vatReport ? {
        grossRevenueIls: Number(p.vatReport.grossRevenueIls),
        spreadRevenueIls: Number(p.vatReport.spreadRevenueIls),
        vatPayableIls: Number(p.vatReport.vatPayableIls),
        totalOrders: p.vatReport.totalOrders,
      } : null,
    })),
    annual: {
      year: annualSummary.year,
      totalOrders: annualSummary.totalOrders,
      grossRevenueIls: annualSummary.grossRevenueIls,
      spreadRevenueIls: annualSummary.spreadRevenueIls,
      vatOnRevenueIls: annualSummary.vatOnRevenueIls,
      totalVatPaidIls: annualSummary.totalVatPaidIls,
      realizedGainIls: annualSummary.realizedGainIls,
      realizedLossIls: annualSummary.realizedLossIls,
      netRealizedIls: annualSummary.netRealizedIls,
      estimatedCapGainsTaxIls: annualSummary.estimatedCapGainsTaxIls,
      byAsset: annualSummary.byAsset,
      vatBreakdown: annualSummary.vatBreakdown,
    },
    unrealized,
    recentPrices: recentPrices.map((p: PriceSnapshot) => ({
      id: p.id,
      asset: p.asset,
      priceIls: Number(p.priceIls),
      source: p.source,
      snapshotAt: p.snapshotAt.toISOString(),
    })),
    exportStart: yearStart.toISOString().split('T')[0],
    exportEnd: yearEnd.toISOString().split('T')[0],
    locale,
  };

  return <AccountingClient data={data} />;
}
