'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Direction = 'buy' | 'sell';
type Asset = 'BTC' | 'ETH' | 'USDT' | 'SOL' | 'LTC';
type Fiat = 'ILS';

const FIAT_SYMBOLS: Record<Fiat, string> = { ILS: '₪' };

const ASSETS: Array<{ id: Asset; icon: string; name: string; color: string }> = [
  { id: 'BTC',  icon: '₿', name: 'Bitcoin',  color: '#f97316' },
  { id: 'ETH',  icon: 'Ξ', name: 'Ethereum', color: '#6366f1' },
  { id: 'USDT', icon: '₮', name: 'USDT',     color: '#10b981' },
  { id: 'SOL',  icon: '◎', name: 'Solana',   color: '#a855f7' },
  { id: 'LTC',  icon: 'Ł', name: 'Litecoin', color: '#94a3b8' },
];

interface Quote {
  id: string; rate: string; cryptoAmount: string; fiatAmount: string;
  feeAmount: string; feePercent: string; spreadPercent: string; expiresAt: string;
}

const lbl = {
  he: { buy: 'קנייה', sell: 'מכירה', pay: 'אתה משלם', get: 'אתה מקבל', fee: 'עמלה', btn: 'קבל הצעת מחיר', order: 'המשך', login: 'כנס להמשך', loading: 'טוען...', expires: 'ההצעה תפוג בעוד', err: 'שגיאה, נסה שוב' },
  ru: { buy: 'Купить', sell: 'Продать', pay: 'Вы платите', get: 'Вы получаете', fee: 'Комиссия', btn: 'Получить котировку', order: 'Продолжить', login: 'Войдите', loading: 'Загрузка...', expires: 'Котировка истекает', err: 'Ошибка, попробуйте снова' },
  en: { buy: 'Buy', sell: 'Sell', pay: 'You pay', get: 'You get', fee: 'Fee', btn: 'Get Quote', order: 'Continue', login: 'Log in', loading: 'Loading...', expires: 'Quote expires in', err: 'Error, try again' },
  ar: { buy: 'شراء', sell: 'بيع', pay: 'تدفع', get: 'تستلم', fee: 'رسوم', btn: 'احصل على سعر', order: 'متابعة', login: 'تسجيل الدخول', loading: '...جاري التحميل', expires: 'ينتهي السعر خلال', err: 'خطأ، حاول مرة أخرى' },
};

export function ExchangeWidget({ locale, isLoggedIn }: { locale: string; isLoggedIn: boolean }) {
  const router = useRouter();
  const t = lbl[locale as keyof typeof lbl] ?? lbl.he;

  const [direction, setDirection] = useState<Direction>('buy');
  const [asset, setAsset] = useState<Asset>('BTC');
  const fiat: Fiat = 'ILS';
  const [amount, setAmount] = useState('5000');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ttl, setTtl] = useState(0);
  const [liveRates, setLiveRates] = useState<Record<string, number>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentAsset = ASSETS.find(a => a.id === asset)!;
  const liveRate = liveRates[`${asset}_${fiat}`] ?? 0;
  const precision = ['BTC', 'ETH', 'XMR'].includes(asset) ? 6 : ['SOL', 'LTC'].includes(asset) ? 4 : 2;

  useEffect(() => { fetch('/api/rates').then(r => r.json()).then(d => setLiveRates(d.rates ?? {})).catch(() => {}); }, []);

  useEffect(() => { 
    setQuote(null); 
    setError('');
    // Reset amount to a sensible default for the new direction
    setAmount(direction === 'buy' ? '5000' : '0.1');
  }, [direction]);

  useEffect(() => { setQuote(null); setError(''); }, [asset, fiat, amount]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!quote) return;
    const exp = new Date(quote.expiresAt).getTime();
    const tick = () => {
      const rem = Math.max(0, Math.floor((exp - Date.now()) / 1000));
      setTtl(rem);
      if (rem === 0) { setQuote(null); if (timerRef.current) clearInterval(timerRef.current); }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [quote]);

  const fetchQuote = useCallback(async () => {
    const inputAmt = parseFloat(amount);
    if (!inputAmt || inputAmt <= 0) return;
    setLoading(true); setError(''); setQuote(null);
    try {
      const body = {
        direction,
        asset,
        fiatCurrency: fiat,
        [direction === 'buy' ? 'fiatAmount' : 'cryptoAmount']: inputAmt
      };
      const res = await fetch('/api/quotes', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(body) 
      });
      if (res.status === 401) { router.push(`/${locale}/login`); return; }
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t.err); return; }
      setQuote(data.data);
    } catch { setError(t.err); } finally { setLoading(false); }
  }, [direction, asset, fiat, amount, locale, t, router]);

  function handleOrder() {
    if (!quote) return;
    if (!isLoggedIn) { router.push(`/${locale}/login`); return; }
    sessionStorage.setItem('pendingQuote', JSON.stringify({ quoteId: quote.id, direction, asset, fiat, fiatAmount: amount }));
    router.push(`/${locale}/orders/new`);
  }

  const accentColor = currentAsset.color;
  const quoteCryptoAmt = quote ? parseFloat(quote.cryptoAmount) : 0;
  const quoteFiatAmt = quote ? parseFloat(quote.fiatAmount) : 0;
  
  // Adjusted rate including 10% commission
  // Buy: User gets less crypto -> Price per crypto is HIGHER (Rate / 0.9)
  // Sell: User gets less fiat -> Price per crypto is LOWER (Rate * 0.9)
  const isBuy = direction === 'buy';
  const effectiveLiveRate = isBuy ? (liveRate / 0.9) : (liveRate * 0.9);
  const rate = quote ? parseFloat(quote.rate) : effectiveLiveRate;
  
  const feeAmt = quote ? parseFloat(quote.feeAmount) : 0;

  const parsedAmount = parseFloat(amount.replace(',', '.')) || 0;

  // Estimated calculation based on the effective rate shown
  const estimatedResult = isBuy 
    ? (rate > 0 ? parsedAmount / rate : 0)   // ILS -> Crypto
    : (parsedAmount * rate);                // Crypto -> ILS

  const resultPrecision = isBuy ? precision : 2;
  const displayValue = quote 
    ? (isBuy ? quoteCryptoAmt.toFixed(precision) : quoteFiatAmt.toFixed(2))
    : (estimatedResult > 0 ? `~${estimatedResult.toFixed(resultPrecision)}` : '—');

  // Helper for Asset Selector
  const AssetSelector = () => (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <select
        value={asset}
        onChange={e => setAsset(e.target.value as Asset)}
        style={{
          appearance: 'none', WebkitAppearance: 'none',
          background: `${accentColor}18`, border: `1px solid ${accentColor}44`,
          borderRadius: 10, padding: '6px 28px 6px 10px',
          fontSize: 14, fontWeight: 700, color: accentColor, cursor: 'pointer', outline: 'none',
        }}
      >
        {ASSETS.map(a => (
          <option key={a.id} value={a.id} style={{ background: '#0e1929', color: '#fff' }}>
            {a.id}
          </option>
        ))}
      </select>
      <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: accentColor, pointerEvents: 'none' }}>▾</span>
    </div>
  );

  return (
    <div dir="ltr" style={{
      width: '100%', maxWidth: 420,
      background: 'linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 24,
      padding: 24,
      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
      boxShadow: `0 24px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05), 0 0 80px ${accentColor}18`,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Accent glow top */}
      <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: `${accentColor}20`, filter: 'blur(50px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -40, left: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(30,127,255,0.15)', filter: 'blur(50px)', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20, position: 'relative' }}>
        <span style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>crypto<span style={{ background: 'linear-gradient(135deg,#1e7fff,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>24</span></span>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>Exchange</span>
      </div>

      {/* Buy / Sell toggle */}
      <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 14, padding: 4, marginBottom: 20, border: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
        {(['buy', 'sell'] as Direction[]).map(dir => (
          <button key={dir} onClick={() => setDirection(dir)} style={{
            flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 14, fontWeight: 700,
            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
            background: direction === dir
              ? dir === 'buy' ? 'linear-gradient(135deg,#00c96b,#00a8cc)' : 'linear-gradient(135deg,#ff3b5c,#ff8c00)'
              : 'transparent',
            color: direction === dir ? '#fff' : 'rgba(255,255,255,0.35)',
            boxShadow: direction === dir ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
          }}>
            {dir === 'buy' ? t.buy : t.sell}
          </button>
        ))}
      </div>

      {/* You Pay */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.pay}</div>
        <div style={{
          background: 'rgba(0,0,0,0.35)', borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.09)',
          padding: '14px 16px',
          transition: 'border-color 0.2s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <input
              type="number" value={amount} onChange={e => setAmount(e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 28, fontWeight: 800, color: '#fff', minWidth: 0 }}
              placeholder={isBuy ? "5000" : "0.1"}
            />
            {isBuy ? (
               <span style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>{FIAT_SYMBOLS[fiat]}</span>
            ) : <AssetSelector />}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.35)', paddingTop: 2 }}>
            {isBuy ? '₪ שקל ישראלי / Израильский шекель' : currentAsset.name}
          </div>
        </div>
      </div>

      {/* Swap arrow */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 8px' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* You Get */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.get}</div>
        <div style={{ background: 'rgba(0,0,0,0.35)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.09)', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <span style={{ flex: 1, fontSize: 28, fontWeight: 800, color: (quote || estimatedResult > 0) ? '#fff' : 'rgba(255,255,255,0.2)' }}>
              {displayValue}
            </span>
            {isBuy ? <AssetSelector /> : <span style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>{FIAT_SYMBOLS[fiat]}</span>}
          </div>
          {/* Description line for Result */}
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.35)', paddingTop: 2, marginBottom: 10 }}>
            {isBuy ? currentAsset.name : '₪ שקל ישראלי / Израильский шекель'}
          </div>
          {/* Rate row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            <span>1 {asset} ≈ {FIAT_SYMBOLS[fiat]}{liveRate ? (liveRate).toLocaleString() : '—'}</span>
            {quote && <span>{t.fee}: {FIAT_SYMBOLS[fiat]}{feeAmt.toFixed(2)}</span>}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: 13, textAlign: 'center' }}>
          {error}
        </div>
      )}

      {/* Quote TTL */}
      {quote && (
        <div style={{ marginBottom: 12, textAlign: 'center', fontSize: 12, color: accentColor, fontWeight: 600 }}>
          ⏱ {t.expires}: {ttl}s
        </div>
      )}

      {/* Action button */}
      {!quote ? (
        <button
          onClick={fetchQuote}
          disabled={loading || !amount || parseFloat(amount) <= 0}
          style={{
            width: '100%', padding: '16px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
            fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '0.02em',
            background: direction === 'buy'
              ? 'linear-gradient(135deg,#00c96b,#00a8cc)'
              : 'linear-gradient(135deg,#ff3b5c,#ff8c00)',
            boxShadow: direction === 'buy' ? '0 8px 24px rgba(0,201,107,0.35)' : '0 8px 24px rgba(255,59,92,0.35)',
            opacity: (loading || !amount || parseFloat(amount) <= 0) ? 0.5 : 1,
            transition: 'all 0.2s',
          }}
        >
          {loading ? t.loading : t.btn}
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setQuote(null)} style={{
            width: 52, height: 52, borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.06)', cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
            </svg>
          </button>
          <button onClick={handleOrder} style={{
            flex: 1, padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
            fontSize: 15, fontWeight: 800, color: '#fff',
            background: 'linear-gradient(135deg,#1e7fff,#6b3fff)',
            boxShadow: '0 8px 24px rgba(30,127,255,0.35)',
            transition: 'all 0.2s',
          }}>
            {isLoggedIn ? t.order : t.login}
          </button>
        </div>
      )}

      {/* Trust micro-badges */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
        <span>🔒 KYC/AML</span>
        <span>⚡ IL Regulated</span>
        <span>💳 Bit / PayBox</span>
      </div>
    </div>
  );
}
