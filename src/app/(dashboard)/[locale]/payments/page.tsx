'use client';

import { useState } from 'react';

const labels = {
  he: {
    title: '💳 uPay — חיוב ידני',
    subtitle: 'מלאו את הפרטים וצרו רשומת תשלום. לאחר מכן, חיבו את הכרטיס בדשבורד uPay.',
    warningTitle: '⚠️ חשוב לדעת',
    warningBody: 'uPay לא מספקת API ציבורי. החיוב מתבצע ידנית בדשבורד שלהם. מערכת זו יוצרת רשומה ומספקת הוראות לאופרטור.',
    orderId: 'מספר הזמנה *', customerName: 'שם לקוח', phone: 'טלפון',
    amount: 'סכום (₪) *', last4: '4 ספרות אחרונות', notes: 'הערות פנימיות',
    submit: 'צור רשומת תשלום', loading: 'יוצר רשומה...',
    errors: { network: 'שגיאת רשת', generic: 'שגיאה' },
    placeholders: { orderId: 'clxxx...', name: 'ישראל ישראלי', phone: '050-0000000', amount: '5000', last4: '1234', notes: 'הערות...' },
  },
  ru: {
    title: '💳 uPay — ручной платёж',
    subtitle: 'Заполните данные и создайте запись о платеже. Затем выполните списание в дашборде uPay.',
    warningTitle: '⚠️ Важно знать',
    warningBody: 'uPay не предоставляет публичный API. Списание выполняется вручную в их дашборде. Эта система создаёт запись и предоставляет инструкции оператору.',
    orderId: 'Номер заявки *', customerName: 'Имя клиента', phone: 'Телефон',
    amount: 'Сумма (₪) *', last4: 'Последние 4 цифры', notes: 'Внутренние заметки',
    submit: 'Создать запись', loading: 'Создание...',
    errors: { network: 'Ошибка сети', generic: 'Ошибка' },
    placeholders: { orderId: 'clxxx...', name: 'Иван Иванов', phone: '+972-50-000-0000', amount: '5000', last4: '1234', notes: 'Заметки...' },
  },
};

const inp: React.CSSProperties = {
  width: '100%', height: 46, padding: '0 14px',
  background: 'rgba(255,255,255,0.06)',
  border: '1.5px solid rgba(255,255,255,0.12)',
  borderRadius: 10, color: 'white', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit',
};
const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 20, padding: '24px',
};

export default function PaymentsPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const L = labels[locale as 'he' | 'ru'] ?? labels.ru;
  const isRtl = locale === 'he';

  const [form, setForm] = useState({ orderId: '', customerName: '', customerPhone: '', amountIls: '', last4: '', notes: '' });
  const [result, setResult] = useState<{ instructions?: { he: string; ru?: string }; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  function update(k: keyof typeof form, v: string) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  const lbl: React.CSSProperties = {
    display: 'block', color: '#94a3b8', fontSize: 12, fontWeight: 700,
    marginBottom: 8, letterSpacing: 0.3, textTransform: 'uppercase',
    textAlign: isRtl ? 'right' : 'left',
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setResult(null);
    try {
      const res = await fetch('/api/payments/upay', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amountIls: parseFloat(form.amountIls) }),
      });
      const data = await res.json();
      if (!res.ok) setResult({ error: data.error ?? L.errors.generic });
      else setResult(data.data);
    } catch { setResult({ error: L.errors.network }); } finally { setLoading(false); }
  }

  return (
    <div style={{
      padding: '28px 24px', maxWidth: 600, margin: '0 auto',
      fontFamily: "'Inter', -apple-system, sans-serif",
      direction: isRtl ? 'rtl' : 'ltr',
    }}>
      <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>
        {L.title}
      </h1>
      <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 20px' }}>
        {L.subtitle}
      </p>

      <div style={{
        padding: '14px 18px', borderRadius: 14, marginBottom: 20,
        background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)',
      }}>
        <p style={{ color: '#fbbf24', fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>{L.warningTitle}</p>
        <p style={{ color: '#94a3b8', fontSize: 13, margin: 0, lineHeight: 1.6 }}>{L.warningBody}</p>
      </div>

      <form onSubmit={handleSubmit} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={lbl}>{L.orderId}</label>
          <input value={form.orderId} onChange={e => update('orderId', e.target.value)} required style={{ ...inp, textAlign: isRtl ? 'right' : 'left' }} placeholder={L.placeholders.orderId} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={lbl}>{L.customerName}</label>
            <input value={form.customerName} onChange={e => update('customerName', e.target.value)} style={{ ...inp, textAlign: isRtl ? 'right' : 'left' }} placeholder={L.placeholders.name} />
          </div>
          <div>
            <label style={lbl}>{L.phone}</label>
            <input type="tel" value={form.customerPhone} onChange={e => update('customerPhone', e.target.value)} style={{ ...inp, direction: 'ltr', textAlign: 'left' }} placeholder={L.placeholders.phone} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={lbl}>{L.amount}</label>
            <input type="number" value={form.amountIls} onChange={e => update('amountIls', e.target.value)} required style={{ ...inp, direction: 'ltr', textAlign: 'left' }} placeholder={L.placeholders.amount} />
          </div>
          <div>
            <label style={lbl}>{L.last4}</label>
            <input type="text" maxLength={4} value={form.last4} onChange={e => update('last4', e.target.value)} style={{ ...inp, direction: 'ltr', textAlign: 'center', letterSpacing: 4 }} placeholder={L.placeholders.last4} />
          </div>
        </div>

        <div>
          <label style={lbl}>{L.notes}</label>
          <textarea value={form.notes} onChange={e => update('notes', e.target.value)}
            style={{ ...inp, height: 80, padding: '12px 14px', resize: 'none' as const, textAlign: isRtl ? 'right' : 'left' }} placeholder={L.placeholders.notes} />
        </div>

        <button type="submit" disabled={loading} style={{
          height: 50, background: loading ? 'rgba(59,130,246,0.4)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          border: 'none', borderRadius: 12, color: 'white', fontSize: 15, fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
        }}>
          {loading ? L.loading : L.submit}
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
              whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: 0,
              textAlign: isRtl ? 'right' : 'left',
            }}>
              {isRtl ? result.instructions?.he : (result.instructions?.ru ?? result.instructions?.he)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
