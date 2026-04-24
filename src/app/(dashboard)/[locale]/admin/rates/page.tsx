import { getSession, isFinanceOrAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

const CRYPTO_ASSETS = ['BTC', 'ETH', 'USDT', 'USDT_TRC20', 'USDC', 'SOL', 'LTC', 'XMR'];
const FIAT_CURRENCIES = ['ILS', 'USD', 'EUR'];

const ASSET_ICONS: Record<string, string> = {
  BTC: '₿', ETH: 'Ξ', USDT: '₮', USDT_TRC20: '₮', USDC: '$', SOL: '◎', LTC: 'Ł', XMR: 'ɱ',
};

const card = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 20,
  overflow: 'hidden',
} as const;

export default async function RatesManagerPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isFinanceOrAdmin(session)) redirect(`/${locale}/dashboard`);

  const configs = await prisma.rateConfig.findMany({
    orderBy: [{ asset: 'asc' }, { fiatCurrency: 'asc' }],
  });

  const isRtl = locale === 'he';

  const configMap = new Map<string, Map<string, typeof configs[0]>>();
  CRYPTO_ASSETS.forEach(asset => {
    const assetMap = new Map<string, typeof configs[0]>();
    FIAT_CURRENCIES.forEach(fiat => {
      const config = configs.find(c => c.asset === asset && c.fiatCurrency === fiat);
      if (config) assetMap.set(fiat, config);
    });
    configMap.set(asset, assetMap);
  });

  const rows: Array<{ asset: string; fiat: string; config: typeof configs[0] | undefined }> = [];
  CRYPTO_ASSETS.forEach(asset => {
    FIAT_CURRENCIES.forEach(fiat => {
      rows.push({ asset, fiat, config: configMap.get(asset)?.get(fiat) });
    });
  });

  return (
    <div style={{
      padding: '28px 24px', maxWidth: 1000, margin: '0 auto',
      fontFamily: "'Inter', -apple-system, sans-serif",
      direction: isRtl ? 'rtl' : 'ltr',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: isRtl ? 'row-reverse' : 'row', marginBottom: 24 }}>
        <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: 0 }}>
          💱 {isRtl ? 'מנהל שערים וקומיסיה' : 'Rates & Fees Manager'}
        </h1>
        <Link href={`/${locale}/admin`} style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>
          {isRtl ? '→ חזרה' : '← Back'}
        </Link>
      </div>

      <div style={card}>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr 1fr 1fr 1fr',
          padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.09)',
          background: 'rgba(255,255,255,0.03)', gap: 12,
        }}>
          {[
            isRtl ? 'נכס' : 'Asset',
            isRtl ? 'מטבע' : 'Currency',
            isRtl ? 'ספרד %' : 'Spread %',
            isRtl ? 'עמלה %' : 'Fee %',
            isRtl ? 'שער ידני' : 'Manual Rate',
            isRtl ? 'מקור' : 'Source',
          ].map(h => (
            <span key={h} style={{ color: '#64748b', fontSize: 12, fontWeight: 600, textAlign: isRtl ? 'right' : 'left' }}>{h}</span>
          ))}
        </div>

        {rows.map(({ asset, fiat, config }, idx) => {
          const isFirst = idx === 0 || rows[idx - 1].asset !== asset;
          return (
            <div
              key={`${asset}-${fiat}`}
              style={{
                display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr 1fr 1fr 1fr',
                padding: '12px 20px', gap: 12, alignItems: 'center',
                borderBottom: idx < rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                background: isFirst ? 'rgba(255,255,255,0.02)' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                {isFirst && (
                  <>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))',
                      border: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 800, color: '#94a3b8', flexShrink: 0,
                    }}>
                      {ASSET_ICONS[asset] ?? asset[0]}
                    </div>
                    <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{asset}</span>
                  </>
                )}
              </div>
              <span style={{
                display: 'inline-flex', padding: '3px 10px', borderRadius: 99, width: 'fit-content',
                background: fiat === 'ILS' ? 'rgba(52,211,153,0.1)' : fiat === 'USD' ? 'rgba(96,165,250,0.1)' : 'rgba(167,139,250,0.1)',
                color: fiat === 'ILS' ? '#34d399' : fiat === 'USD' ? '#60a5fa' : '#a78bfa',
                fontSize: 11, fontWeight: 700,
              }}>
                {fiat}
              </span>
              <span style={{ color: config ? 'white' : '#334155', fontSize: 13, fontWeight: config ? 600 : 400 }}>
                {config?.spreadPercent != null ? `${config.spreadPercent}%` : '—'}
              </span>
              <span style={{ color: config ? '#fbbf24' : '#334155', fontSize: 13, fontWeight: config ? 600 : 400 }}>
                {config?.feePercent != null ? `${config.feePercent}%` : '—'}
              </span>
              <span style={{ color: config?.manualRate ? '#94a3b8' : '#334155', fontSize: 13 }}>
                {config?.manualRate ? Number(config.manualRate).toLocaleString() : '—'}
              </span>
              <span style={{
                color: '#475569', fontSize: 12,
                background: 'rgba(255,255,255,0.04)', padding: '3px 8px', borderRadius: 6,
                display: 'inline-block', width: 'fit-content',
              }}>
                {config?.source ?? '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
