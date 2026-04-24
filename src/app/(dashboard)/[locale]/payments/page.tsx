'use client';

import { useState } from 'react';

const inp: React.CSSProperties = {
  width: '100%', height: 46, padding: '0 14px',
  background: 'rgba(255,255,255,0.06)',
  border: '1.5px solid rgba(255,255,255,0.12)',
  borderRadius: 10, color: 'white', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit', textAlign: 'right',
};
const lbl: React.CSSProperties = {
  display: 'block', color: '#94a3b8', fontSize: 12, fontWeight: 700,
  marginBottom: 8, letterSpacing: 0.3, textTransform: 'uppercase',
  textAlign: 'right',
};
const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 20, padding: '24px',
};

export default function PaymentsPage({ params }: { params: { locale: string } }) {
  const [form, setForm] = useState({ orderId: '', customerName: '', customerPhone: '', amountIls: '', last4: '', notes: '' });
  const [result, setResult] = useState<{ instructions?: { he: string }; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  function update(k: keyof typeof form, v: string) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setResult(null);
    try {
      const res = await fetch('/api/payments/upay', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amountIls: parseFloat(form.amountIls) }),
      });
      const data = await res.json();
      if (!res.ok) setResult({ error: data.error ?? 'שגיאה' });
      else setResult(data.data);
    } catch { setResult({ error: 'שגיאת רשת' }); } finally { setLoading(false); }
  }

  return (
    <div style={{
      padding: '28px 24px', maxWidth: 600, margin: '0 auto',
      fontFamily: "'Inter', -apple-system, sans-serif",
      direction: 'rtl',
    }}>

      <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: '0 0 6px', textAlign: 'right' }}>
        💳 uPay — חיוב ידני
      </h1>
      <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 20px', textAlign: 'right' }}>
        מלאו את הפרטים וצרו רשומת תשלום. לאחר מכן, חיבו את הכרטיס בדשבורד uPay.
      </p>

      {/* Info banner */}
      <div style={{
        padding: '14px 18px', borderRadius: 14, marginBottom: 20,
        background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)',
      }}>
        <p style={{ color: '#fbbf24', fontWeight: 700, fontSize: 14, margin: '0 0 4px', textAlign: 'right' }}>⚠️ חשוב לדעת</p>
        <p style={{ color: '#94a3b8', fontSize: 13, margin: 0, textAlign: 'right', lineHeight: 1.6 }}>
          uPay לא מספקת API ציבורי. החיוב מתבצע ידנית בדשבורד שלהם.
          מערכת זו יוצרת רשומה ומספקת הוראות לאופרטור.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={lbl}>מספר הזמנה *</label>
          <input value={form.orderId} onChange={e => update('orderId', e.target.value)} required style={inp} placeholder="clxxx..." />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={lbl}>שם לקוח</label>
            <input value={form.customerName} onChange={e => update('customerName', e.target.value)} style={inp} placeholder="ישראל ישראלי" />
          </div>
          <div>
            <label style={lbl}>טלפון</label>
            <input type="tel" value={form.customerPhone} onChange={e => update('customerPhone', e.target.value)} style={{ ...inp, direction: 'ltr', textAlign: 'left' }} placeholder="050-0000000" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={lbl}>סכום (₪) *</label>
            <input type="number" value={form.amountIls} onChange={e => update('amountIls', e.target.value)} required style={{ ...inp, direction: 'ltr', textAlign: 'left' }} placeholder="5000" />
          </div>
          <div>
            <label style={lbl}>4 ספרות אחרונות</label>
            <input type="text" maxLength={4} value={form.last4} onChange={e => update('last4', e.target.value)} style={{ ...inp, direction: 'ltr', textAlign: 'center', letterSpacing: 4 }} placeholder="1234" />
          </div>
        </div>

        <div>
          <label style={lbl}>הערות פנימיות</label>
          <textarea value={form.notes} onChange={e => update('notes', e.target.value)}
            style={{ ...inp, height: 80, padding: '12px 14px', resize: 'none' as const }} placeholder="הערות..." />
        </div>

        <button type="submit" disabled={loading} style={{
          height: 50, background: loading ? 'rgba(59,130,246,0.4)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          border: 'none', borderRadius: 12, color: 'white', fontSize: 15, fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
        }}>
          {loading ? 'יוצר רשומה...' : 'צור רשומת תשלום'}
        </button>
      </form>

      {result && (
        <div style={{
          marginTop: 16, padding: '20px 24px', borderRadius: 20,
          background: result.error ? 'rgba(248,113,113,0.07)' : 'rgba(52,211,153,0.07)',
          border: `1px solid ${result.error ? 'rgba(248,113,113,0.25)' : 'rgba(52,211,153,0.25)'}`,
        }}>
          {result.error ? (
            <p style={{ color: '#f87171', fontSize: 14, margin: 0 }}>{result.error}</p>
          ) : (
            <pre style={{
              color: '#6ee7b7', fontSize: 13, fontFamily: 'monospace',
              whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: 0, textAlign: 'right',
            }}>
              {result.instructions?.he}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
