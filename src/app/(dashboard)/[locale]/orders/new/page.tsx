'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'quote' | 'details' | 'review';
type Direction = 'buy' | 'sell';
type Asset = 'BTC' | 'ETH' | 'USDT' | 'USDC';
type Fiat = 'ILS' | 'USD' | 'EUR';
type Method = 'BIT' | 'PAYBOX';

const FIAT_SYMBOLS: Record<Fiat, string> = { ILS: '₪', USD: '$', EUR: '€' };
const ASSET_ICONS: Record<Asset, string> = { BTC: '₿', ETH: 'Ξ', USDT: '₮', USDC: 'Ⓒ' };

interface Quote {
  id: string; rate: string; cryptoAmount: string; fiatAmount: string;
  feeAmount: string; feePercent: string; spreadPercent: string; expiresAt: string;
}

const labels = {
  he: {
    title: 'הזמנה חדשה', step1: 'קבל מחיר', step2: 'פרטים', step3: 'אישור',
    direction: 'סוג עסקה', buy: 'קנייה', sell: 'מכירה',
    asset: 'נכס', fiatCurrency: 'מטבע', amount: 'סכום',
    getQuote: 'קבל הצעת מחיר', loading: 'טוען...',
    youGet: 'תקבל', rate: 'שער', fee: 'עמלה',
    paymentMethod: 'אמצעי תשלום', walletAddress: 'כתובת ארנק (לקבלת קריפטו)',
    legalAck: 'קראתי ואני מסכים/ה לתנאי השימוש, מדיניות AML/KYC וגילוי הסיכונים',
    legalRequired: 'נדרש אישור תנאים', next: 'הבא', back: 'חזור',
    submit: 'שלח הזמנה', submitting: 'שולח...', quoteExpires: 'המחיר תקף עוד', seconds: 'שניות',
    error: 'שגיאה. נסה שוב.', methodBit: 'ביט', methodPaybox: 'כרטיס אשראי',
    noWallets: 'אין ארנקים מאומתים. הוסף ארנק בהגדרות.',
  },
  ru: {
    title: 'Новая заявка', step1: 'Котировка', step2: 'Детали', step3: 'Подтверждение',
    direction: 'Тип сделки', buy: 'Купить', sell: 'Продать',
    asset: 'Актив', fiatCurrency: 'Валюта', amount: 'Сумма',
    getQuote: 'Получить котировку', loading: 'Загрузка...',
    youGet: 'Вы получите', rate: 'Курс', fee: 'Комиссия',
    paymentMethod: 'Способ оплаты', walletAddress: 'Адрес кошелька (для получения крипто)',
    legalAck: 'Я прочитал(а) и согласен(на) с условиями использования, политикой AML/KYC и раскрытием рисков',
    legalRequired: 'Необходимо принять условия', next: 'Далее', back: 'Назад',
    submit: 'Подать заявку', submitting: 'Отправка...', quoteExpires: 'Котировка действительна', seconds: 'сек',
    error: 'Ошибка. Попробуйте снова.', methodBit: 'Bit', methodPaybox: 'Кредитная карта',
    noWallets: 'Нет верифицированных кошельков. Добавьте кошелёк в настройках.',
  },
};

/* ─── shared mini design tokens ─── */
const inp = (isRtl: boolean): React.CSSProperties => ({
  width: '100%', height: 48, padding: '0 14px',
  background: 'rgba(255,255,255,0.07)',
  border: '1.5px solid rgba(255,255,255,0.12)',
  borderRadius: 12, color: 'white', fontSize: 15,
  outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit',
  textAlign: isRtl ? 'right' : 'left',
});

const lbl: React.CSSProperties = {
  display: 'block', color: '#94a3b8',
  fontSize: 12, fontWeight: 700, marginBottom: 8,
  letterSpacing: 0.3, textTransform: 'uppercase',
};

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 20, padding: '22px 24px',
};

const errBox: React.CSSProperties = {
  padding: '12px 16px', borderRadius: 10,
  background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
  color: '#fca5a5', fontSize: 13,
};

const primaryBtn = (disabled = false): React.CSSProperties => ({
  flex: 1, height: 50,
  background: disabled ? 'rgba(59,130,246,0.35)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
  border: 'none', borderRadius: 13, color: 'white', fontSize: 15, fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
  opacity: disabled ? 0.7 : 1,
});

const ghostBtn: React.CSSProperties = {
  height: 50, padding: '0 20px',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 13, color: '#94a3b8', fontSize: 14, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
};

export default function NewOrderPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const L = labels[locale as 'he' | 'ru'] ?? labels.he;
  const router = useRouter();
  const isRtl = locale === 'he';

  const [step, setStep] = useState<Step>('quote');
  const [direction, setDirection] = useState<Direction>('buy');
  const [asset, setAsset] = useState<Asset>('BTC');
  const [fiat, setFiat] = useState<Fiat>('ILS');
  const [fiatInput, setFiatInput] = useState('1000');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [ttl, setTtl] = useState(0);
  const [method, setMethod] = useState<Method>('BIT');
  const [walletId, setWalletId] = useState('');
  const [wallets, setWallets] = useState<Array<{ id: string; address: string; asset: string; verificationStatus: string }>>([]);
  const [legalAck, setLegalAck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/wallets').then(r => r.json()).then(d => setWallets(d.data?.wallets ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem('pendingQuote');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.direction) setDirection(parsed.direction);
        if (parsed.asset) setAsset(parsed.asset);
        if (parsed.fiat) setFiat(parsed.fiat);
        if (parsed.fiatAmount) setFiatInput(parsed.fiatAmount);
      } catch {}
      sessionStorage.removeItem('pendingQuote');
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!quote) return;
    const expiresAt = new Date(quote.expiresAt).getTime();
    const tick = () => {
      const rem = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTtl(rem);
      if (rem === 0) { setQuote(null); setStep('quote'); }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [quote]);

  const fetchQuote = useCallback(async () => {
    const fiatAmt = parseFloat(fiatInput);
    if (!fiatAmt || fiatAmt <= 0) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction, asset, fiatCurrency: fiat, fiatAmount: fiatAmt }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? L.error); return; }
      setQuote(data.data);
      setStep('details');
    } catch { setError(L.error); } finally { setLoading(false); }
  }, [direction, asset, fiat, fiatInput, L]);

  async function handleSubmit() {
    if (!quote) return;
    if (!legalAck) { setError(L.legalRequired); return; }
    setLoading(true); setError('');
    try {
      const createRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction, asset, fiatCurrency: fiat, paymentMethod: method, quoteId: quote.id, walletId: walletId || undefined, legalAcknowledged: true }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) { setError(createData.error ?? L.error); return; }
      const orderId = createData.data.id;
      const submitRes = await fetch(`/api/orders/${orderId}/submit`, { method: 'POST' });
      const submitData = await submitRes.json();
      if (!submitRes.ok) { setError(submitData.error ?? L.error); }
      router.push(`/${locale}/orders/${orderId}`);
    } catch { setError(L.error); } finally { setLoading(false); }
  }

  const verifiedWallets = wallets.filter(w => w.asset === asset && w.verificationStatus === 'verified');
  const rate = quote ? parseFloat(quote.rate) : 0;
  const cryptoAmt = quote ? parseFloat(quote.cryptoAmount) : 0;
  const feeAmt = quote ? parseFloat(quote.feeAmount) : 0;
  const steps: [Step, string][] = [['quote', L.step1], ['details', L.step2], ['review', L.step3]];
  const stepIndex = steps.findIndex(([s]) => s === step);

  return (
    <div style={{
      padding: '28px 24px', maxWidth: 560, margin: '0 auto',
      fontFamily: "'Inter', -apple-system, sans-serif",
      direction: isRtl ? 'rtl' : 'ltr',
    }}>

      {/* Title */}
      <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: '0 0 24px' }}>
        {L.title}
      </h1>

      {/* Step indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0,
        flexDirection: isRtl ? 'row-reverse' : 'row',
        marginBottom: 28,
      }}>
        {steps.map(([s, label], i) => {
          const done = i < stepIndex;
          const active = s === step;
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 0, flexDirection: isRtl ? 'row-reverse' : 'row' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800,
                  background: done ? '#34d399' : active ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.08)',
                  color: done || active ? 'white' : '#64748b',
                  border: done || active ? 'none' : '1px solid rgba(255,255,255,0.12)',
                }}>
                  {done ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 13, fontWeight: active ? 700 : 400, color: active ? 'white' : '#64748b' }}>
                  {label}
                </span>
              </div>
              {i < 2 && (
                <div style={{ width: 24, height: 1, background: i < stepIndex ? '#34d399' : 'rgba(255,255,255,0.1)', margin: '0 8px', flexShrink: 0 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Step 1: Quote ─── */}
      {step === 'quote' && (
        <div style={card}>

          {/* Buy / Sell toggle */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ ...lbl, textAlign: isRtl ? 'right' : 'left' }}>{L.direction}</label>
            <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
              {(['buy', 'sell'] as Direction[]).map(d => (
                <button key={d} onClick={() => setDirection(d)} style={{
                  flex: 1, height: 40, borderRadius: 10, border: 'none',
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  background: direction === d
                    ? (d === 'buy' ? 'linear-gradient(135deg, #10b981, #06b6d4)' : 'linear-gradient(135deg, #ef4444, #f97316)')
                    : 'transparent',
                  color: direction === d ? 'white' : '#64748b',
                  transition: 'all 0.2s',
                }}>
                  {L[d]}
                </button>
              ))}
            </div>
          </div>

          {/* Asset selector */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ ...lbl, textAlign: isRtl ? 'right' : 'left' }}>{L.asset}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {(['BTC', 'ETH', 'USDT', 'USDC'] as Asset[]).map(a => (
                <button key={a} onClick={() => setAsset(a)} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  padding: '12px 8px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: asset === a ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
                  outline: asset === a ? '1.5px solid rgba(59,130,246,0.5)' : '1px solid rgba(255,255,255,0.08)',
                  color: asset === a ? '#60a5fa' : '#64748b',
                  transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: 18 }}>{ASSET_ICONS[a]}</span>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{a}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ ...lbl, textAlign: isRtl ? 'right' : 'left' }}>{L.amount}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={fiat} onChange={e => setFiat(e.target.value as Fiat)} style={{
                height: 48, padding: '0 12px',
                background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)',
                borderRadius: 12, color: 'white', fontSize: 14, outline: 'none',
                fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0,
              }}>
                {(['ILS', 'USD', 'EUR'] as Fiat[]).map(f => (
                  <option key={f} value={f} style={{ background: '#0f172a' }}>{FIAT_SYMBOLS[f]} {f}</option>
                ))}
              </select>
              <input type="number" value={fiatInput} onChange={e => setFiatInput(e.target.value)}
                style={{ ...inp(isRtl), flex: 1 }} placeholder="1000" min="0" />
            </div>
          </div>

          {error && <div style={{ ...errBox, marginBottom: 16 }}>⚠️ {error}</div>}

          <button onClick={fetchQuote} disabled={loading} style={{
            width: '100%', height: 50,
            background: loading ? 'rgba(59,130,246,0.4)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            border: 'none', borderRadius: 13, color: 'white', fontSize: 15, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 20px rgba(59,130,246,0.25)',
          }}>
            {loading ? L.loading : L.getQuote}
          </button>
        </div>
      )}

      {/* ─── Step 2: Details ─── */}
      {step === 'details' && quote && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Quote card */}
          <div style={card}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', flexDirection: isRtl ? 'row-reverse' : 'row',
              marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.07)',
            }}>
              <span style={{ color: '#64748b', fontSize: 12 }}>
                ⏱ {L.quoteExpires}: {ttl}s
              </span>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: ttl > 30 ? '#34d399' : ttl > 10 ? '#fbbf24' : '#f87171',
                animation: 'pulse 1.5s infinite',
              }} />
            </div>
            {[
              { label: L.youGet, value: `${cryptoAmt.toFixed(8)} ${asset}`, color: '#34d399', large: true },
              { label: L.rate, value: `1 ${asset} = ${rate.toLocaleString()} ${fiat}`, color: 'white' },
              { label: L.fee, value: `${feeAmt.toFixed(2)} ${fiat}`, color: '#94a3b8' },
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', flexDirection: isRtl ? 'row-reverse' : 'row',
                marginBottom: 10, alignItems: 'center',
              }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>{row.label}</span>
                <span style={{ color: row.color, fontSize: row.large ? 16 : 13, fontWeight: row.large ? 800 : 500 }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Payment method */}
          <div style={card}>
            <label style={{ ...lbl, textAlign: isRtl ? 'right' : 'left' }}>{L.paymentMethod}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {([
                ['BIT',    L.methodBit,    '🏦'],
                ['PAYBOX', L.methodPaybox, '💳'],
              ] as [Method, string, string][]).map(([m, label, icon]) => (
                <button key={m} onClick={() => setMethod(m)} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  flexDirection: isRtl ? 'row-reverse' : 'row',
                  width: '100%', padding: '12px 16px', borderRadius: 12,
                  background: method === m ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${method === m ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    background: method === m ? '#3b82f6' : 'transparent',
                    border: `2px solid ${method === m ? '#3b82f6' : 'rgba(255,255,255,0.3)'}`,
                  }} />
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <span style={{ color: method === m ? '#93c5fd' : '#94a3b8', fontSize: 14, fontWeight: method === m ? 700 : 500 }}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Wallet (buy only) */}
          {direction === 'buy' && (
            <div style={card}>
              <label style={{ ...lbl, textAlign: isRtl ? 'right' : 'left' }}>{L.walletAddress}</label>
              {verifiedWallets.length > 0 ? (
                <select value={walletId} onChange={e => setWalletId(e.target.value)} style={inp(isRtl)}>
                  <option value="" style={{ background: '#0f172a' }}>—</option>
                  {verifiedWallets.map(w => (
                    <option key={w.id} value={w.id} style={{ background: '#0f172a' }}>
                      {w.address.slice(0, 20)}...{w.address.slice(-8)}
                    </option>
                  ))}
                </select>
              ) : (
                <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>{L.noWallets}</p>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexDirection: isRtl ? 'row-reverse' : 'row' }}>
            <button onClick={() => setStep('quote')} style={ghostBtn}>{L.back}</button>
            <button onClick={() => setStep('review')} style={primaryBtn()}>{L.next}</button>
          </div>
        </div>
      )}

      {/* ─── Step 3: Review ─── */}
      {step === 'review' && quote && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={card}>
            <h2 style={{ color: 'white', fontWeight: 700, fontSize: 16, margin: '0 0 18px' }}>✅ {L.step3}</h2>
            {[
              { label: L.direction, value: direction === 'buy' ? L.buy : L.sell, color: direction === 'buy' ? '#34d399' : '#f87171' },
              { label: L.asset, value: `${ASSET_ICONS[asset]} ${asset}`, color: 'white' },
              { label: L.amount, value: `${parseFloat(fiatInput).toLocaleString()} ${fiat}`, color: 'white' },
              { label: L.youGet, value: `${cryptoAmt.toFixed(8)} ${asset}`, color: '#60a5fa' },
              { label: L.rate, value: `${rate.toLocaleString()} ${fiat}`, color: '#94a3b8' },
              { label: L.fee, value: `${feeAmt.toFixed(2)} ${fiat}`, color: '#94a3b8' },
              { label: L.paymentMethod, value: method, color: 'white' },
            ].map((row, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between',
                flexDirection: isRtl ? 'row-reverse' : 'row',
                padding: '10px 0',
                borderBottom: i < 6 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                alignItems: 'center',
              }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>{row.label}</span>
                <span style={{ color: row.color, fontSize: 14, fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Legal acknowledgement */}
          <div style={{
            ...card, display: 'flex', alignItems: 'flex-start', gap: 12,
            flexDirection: isRtl ? 'row-reverse' : 'row',
            background: legalAck ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${legalAck ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.09)'}`,
          }}>
            <input
              type="checkbox" id="legal" checked={legalAck}
              onChange={e => setLegalAck(e.target.checked)}
              style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0, cursor: 'pointer', accentColor: '#3b82f6' }}
            />
            <label htmlFor="legal" style={{
              color: '#94a3b8', fontSize: 13, lineHeight: 1.6,
              cursor: 'pointer', textAlign: isRtl ? 'right' : 'left',
            }}>
              {L.legalAck}
            </label>
          </div>

          {error && <div style={errBox}>⚠️ {error}</div>}

          <div style={{ display: 'flex', gap: 10, flexDirection: isRtl ? 'row-reverse' : 'row' }}>
            <button onClick={() => setStep('details')} style={ghostBtn}>{L.back}</button>
            <button onClick={handleSubmit} disabled={loading || !legalAck} style={primaryBtn(loading || !legalAck)}>
              {loading ? L.submitting : L.submit}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
