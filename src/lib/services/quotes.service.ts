import { prisma } from '../prisma';
import { cacheQuote, getCachedQuote, invalidateQuote } from '../redis';
import { audit, auditActions } from '../audit';
import { ratesService } from './rates.service';
import { CryptoCurrency, FiatCurrency, OrderType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface QuoteParams {
  userId: string;
  direction: OrderType;
  asset: CryptoCurrency;
  fiatCurrency: FiatCurrency;
  cryptoAmount?: number;
  fiatAmount?: number;
}

export class QuotesService {
  async generate(params: QuoteParams) {
    const config = await prisma.rateConfig.findUnique({
      where: { asset_fiatCurrency: { asset: params.asset, fiatCurrency: params.fiatCurrency } },
    });

    if (!config || !config.isActive) {
      throw new Error(`UNSUPPORTED_PAIR:${params.asset}_${params.fiatCurrency}`);
    }

    const baseRate = config.manualRate
      ? Number(config.manualRate)
      : await this.fetchMarketRate(params.asset, params.fiatCurrency);

    const spreadPct = Number(config.spreadPercent);
    const feePct = Number(config.feePercent);

    // Apply spread: buy = rate * (1 + spread%), sell = rate * (1 - spread%)
    const effectiveRate = params.direction === OrderType.buy
      ? baseRate * (1 + spreadPct / 100)
      : baseRate * (1 - spreadPct / 100);

    let cryptoAmt: number;
    let fiatAmt: number;

    if (params.fiatAmount && params.fiatAmount > 0) {
      fiatAmt = params.fiatAmount;
      cryptoAmt = fiatAmt / effectiveRate;
    } else if (params.cryptoAmount && params.cryptoAmount > 0) {
      cryptoAmt = params.cryptoAmount;
      fiatAmt = cryptoAmt * effectiveRate;
    } else {
      throw new Error('INVALID_AMOUNT');
    }

    const feeAmt = (fiatAmt * feePct) / 100;
    const ttl = parseInt(process.env.QUOTE_TTL_SECONDS ?? '300', 10);

    const quote = await prisma.quote.create({
      data: {
        userId: params.userId,
        direction: params.direction,
        cryptoCurrency: params.asset,
        fiatCurrency: params.fiatCurrency,
        rate: new Decimal(effectiveRate.toFixed(8)),
        cryptoAmount: new Decimal(cryptoAmt.toFixed(8)),
        fiatAmount: new Decimal(fiatAmt.toFixed(2)),
        feeAmount: new Decimal(feeAmt.toFixed(2)),
        feePercent: new Decimal(feePct.toFixed(2)),
        spreadPercent: new Decimal(spreadPct.toFixed(2)),
        expiresAt: new Date(Date.now() + ttl * 1000),
      },
    });

    await cacheQuote(quote.id, quote, ttl);

    await audit({
      actorUserId: params.userId,
      entityType: 'quote', entityId: quote.id,
      action: auditActions.PAYMENT_METHOD_CHECK,
      description: `Quote generated: ${params.direction} ${params.asset}/${params.fiatCurrency} @ ${effectiveRate}`,
    });

    return quote;
  }

  async getValid(quoteId: string, userId: string) {
    // Check cache first
    const cached = await getCachedQuote<{ id: string; expiresAt: string; isUsed: boolean }>(quoteId);
    if (cached && new Date(cached.expiresAt) < new Date()) {
      await invalidateQuote(quoteId);
      throw new Error('QUOTE_EXPIRED');
    }

    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, userId },
    });

    if (!quote) throw new Error('QUOTE_NOT_FOUND');
    if (quote.isUsed) throw new Error('QUOTE_ALREADY_USED');
    if (quote.isExpired || quote.expiresAt < new Date()) {
      await prisma.quote.update({ where: { id: quoteId }, data: { isExpired: true } });
      throw new Error('QUOTE_EXPIRED');
    }

    return quote;
  }

  async markUsed(quoteId: string) {
    await prisma.quote.update({ where: { id: quoteId }, data: { isUsed: true } });
    await invalidateQuote(quoteId);
  }

  async expireStale() {
    const result = await prisma.quote.updateMany({
      where: { isExpired: false, isUsed: false, expiresAt: { lt: new Date() } },
      data: { isExpired: true },
    });
    return result.count;
  }

  /** Fetch live market rate via RatesService (CoinGecko / Binance / manual fallback) */
  private async fetchMarketRate(asset: CryptoCurrency, fiat: FiatCurrency): Promise<number> {
    return ratesService.getRate(asset, fiat);
  }
}

export const quotesService = new QuotesService();
