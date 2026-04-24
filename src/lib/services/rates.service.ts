import { redisGet, redisSet } from '../redis';

const CACHE_TTL = 60; // seconds — refresh rates every 60s

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  USDT_TRC20: 'tether',   // same price as USDT, different network
  USDC: 'usd-coin',
  SOL: 'solana',
  LTC: 'litecoin',
  XMR: 'monero',
};

const COINGECKO_CURRENCIES: Record<string, string> = {
  ILS: 'ils',
  USD: 'usd',
  EUR: 'eur',
};

// Fallback rates when API is unavailable
const FALLBACK_RATES: Record<string, number> = {
  BTC_ILS: 252000,    ETH_ILS: 14200,    USDT_ILS: 3.75,      USDT_TRC20_ILS: 3.75, USDC_ILS: 3.75,
  SOL_ILS: 540,       LTC_ILS: 300,      XMR_ILS: 675,
  BTC_USD: 67500,     ETH_USD: 3800,     USDT_USD: 1,          USDT_TRC20_USD: 1,    USDC_USD: 1,
  SOL_USD: 145,       LTC_USD: 80,       XMR_USD: 180,
  BTC_EUR: 62000,     ETH_EUR: 3500,     USDT_EUR: 0.93,       USDT_TRC20_EUR: 0.93, USDC_EUR: 0.93,
  SOL_EUR: 133,       LTC_EUR: 74,       XMR_EUR: 166,
};

export class RatesService {
  /**
   * Fetch the market rate for a crypto/fiat pair.
   * Uses CoinGecko free API with Redis caching.
   * Falls back to hardcoded rates if API is unavailable.
   */
  async getRate(asset: string, fiat: string): Promise<number> {
    const cacheKey = `rate:${asset}_${fiat}`;

    // Check Redis cache first
    const cached = await redisGet<number>(cacheKey);
    if (cached && !isNaN(cached) && cached > 0) return cached;

    const source = process.env.RATE_SOURCE ?? 'coingecko';

    if (source === 'manual') {
      return this.getFallback(asset, fiat);
    }

    try {
      let rate: number;
      if (source === 'binance') {
        rate = await this.fetchFromBinance(asset, fiat);
      } else {
        rate = await this.fetchFromCoinGecko(asset, fiat);
      }

      // Cache the result
      await redisSet(cacheKey, rate, CACHE_TTL);
      return rate;
    } catch (err) {
      console.error(`[RatesService] Failed to fetch rate ${asset}/${fiat}:`, err);
      return this.getFallback(asset, fiat);
    }
  }

  /**
   * Fetch multiple rates at once — used for the exchange widget.
   */
  async getAllRates(): Promise<Record<string, number>> {
    const assets = ['BTC', 'ETH', 'USDT', 'USDT_TRC20', 'USDC', 'SOL', 'LTC', 'XMR'];
    const fiats = ['ILS', 'USD', 'EUR'];

    const pairs = assets.flatMap(a => fiats.map(f => ({ asset: a, fiat: f })));

    const results = await Promise.allSettled(
      pairs.map(async ({ asset, fiat }) => ({
        key: `${asset}_${fiat}`,
        rate: await this.getRate(asset, fiat),
      })),
    );

    return Object.fromEntries(
      results
        .filter((r): r is PromiseFulfilledResult<{ key: string; rate: number }> => r.status === 'fulfilled')
        .map(r => [r.value.key, r.value.rate]),
    );
  }

  /**
   * Fetch ALL supported assets in a single CoinGecko API call.
   * Returns a flat map: { BTC_ILS: 252000, ETH_ILS: 14200, ... }
   * Cached in Redis for CACHE_TTL seconds.
   */
  async fetchAllFromCoinGecko(): Promise<Record<string, number>> {
    const cacheKey = 'rates:coingecko:all';
    const cached = await redisGet<Record<string, number>>(cacheKey);
    if (cached) return cached;

    const geckoKey = process.env.COINGECKO_API_KEY; // optional Pro key
    const ids = Array.from(new Set(Object.values(COINGECKO_IDS))).join(',');
    const currencies = Object.values(COINGECKO_CURRENCIES).join(',');

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${currencies}&include_24hr_change=true`;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (geckoKey) headers['x-cg-pro-api-key'] = geckoKey;

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);

    const raw = (await res.json()) as Record<string, Record<string, number>>;

    // Build flat map for all asset/fiat combos
    const result: Record<string, number> = {};
    for (const [asset, geckoId] of Object.entries(COINGECKO_IDS)) {
      const prices = raw[geckoId];
      if (!prices) continue;
      for (const [fiat, currency] of Object.entries(COINGECKO_CURRENCIES)) {
        const rate = prices[currency];
        if (rate && rate > 0) result[`${asset}_${fiat}`] = rate;
      }
    }

    await redisSet(cacheKey, result, CACHE_TTL);
    return result;
  }

  private async fetchFromCoinGecko(asset: string, fiat: string): Promise<number> {
    // Try batch fetch first (more efficient)
    try {
      const all = await this.fetchAllFromCoinGecko();
      const rate = all[`${asset}_${fiat}`];
      if (rate && rate > 0) return rate;
    } catch {}

    // Fallback: individual request
    const geckoId = COINGECKO_IDS[asset];
    const currency = COINGECKO_CURRENCIES[fiat];

    if (!geckoId || !currency) {
      throw new Error(`Unsupported pair: ${asset}/${fiat}`);
    }

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=${currency}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);

    const data = (await res.json()) as Record<string, Record<string, number>>;
    const rate = data[geckoId]?.[currency];

    if (!rate || rate <= 0) throw new Error('Invalid rate from CoinGecko');
    return rate;
  }

  private async fetchFromBinance(asset: string, fiat: string): Promise<number> {
    // Binance doesn't support ILS directly — convert via USD
    if (fiat === 'ILS') {
      const assetUsd = await this.fetchFromBinancePair(`${asset}USDT`);
      const ilsRate = await this.getUsdToIlsRate();
      return assetUsd * ilsRate;
    }
    if (fiat === 'EUR') {
      const assetUsd = await this.fetchFromBinancePair(`${asset}USDT`);
      const eurRate = await this.getUsdToEurRate();
      return assetUsd * eurRate;
    }
    // USD
    if (asset === 'USDT' || asset === 'USDC') return 1;
    return await this.fetchFromBinancePair(`${asset}USDT`);
  }

  private async fetchFromBinancePair(symbol: string): Promise<number> {
    const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
    const data = (await res.json()) as { price: string };
    return parseFloat(data.price);
  }

  private async getUsdToIlsRate(): Promise<number> {
    const cacheKey = 'rate:USD_ILS_forex';
    const cached = await redisGet<number>(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=ils,usd',
        { signal: AbortSignal.timeout(5000) },
      );
      const data = (await res.json()) as { tether: { ils: number; usd: number } };
      const rate = data.tether.ils / data.tether.usd; // approx ILS per USD
      await redisSet(cacheKey, rate, 300);
      return rate;
    } catch {
      return 3.75; // fallback
    }
  }

  private async getUsdToEurRate(): Promise<number> {
    return 0.93; // simplified fallback — integrate forex API for production
  }

  private getFallback(asset: string, fiat: string): number {
    const key = `${asset}_${fiat}`;
    const rate = FALLBACK_RATES[key];
    if (!rate) throw new Error(`UNSUPPORTED_PAIR:${asset}_${fiat}`);
    return rate;
  }
}

export const ratesService = new RatesService();
