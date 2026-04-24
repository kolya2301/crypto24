import { NextResponse } from 'next/server';
import { ratesService } from '@/lib/services/rates.service';

/**
 * GET /api/rates — all market rates from CoinGecko.
 * Returns flat map: { BTC_ILS: 252000, ETH_USD: 3800, ... }
 * Also returns asset metadata (24h change).
 * No auth required. Cached in Redis 60s, edge-cached 30s.
 */
export async function GET() {
  try {
    const rates = await ratesService.fetchAllFromCoinGecko();

    // Add USDT_TRC20 = USDT (same price, different network)
    for (const fiat of ['ILS', 'USD', 'EUR']) {
      const usdtRate = rates[`USDT_${fiat}`];
      if (usdtRate) rates[`USDT_TRC20_${fiat}`] = usdtRate;
    }

    return NextResponse.json({ rates, updatedAt: new Date().toISOString() }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch {
    // Return cached fallback rates if CoinGecko is down
    try {
      const rates = await ratesService.getAllRates();
      return NextResponse.json({ rates, updatedAt: new Date().toISOString(), fallback: true });
    } catch {
      return NextResponse.json({ error: 'Failed to fetch rates' }, { status: 500 });
    }
  }
}
