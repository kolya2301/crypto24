'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  locale: string;
  existingProfile?: {
    dateOfBirth: string;
    city: string;
    country: string;
    sourceOfFunds: string;
  };
}

const SOURCE_OPTIONS = {
  he: ['שכר', 'עסקים', 'השקעות', 'חסכונות', 'אחר'],
  ru: ['Зарплата', 'Бизнес', 'Инвестиции', 'Накопления', 'Другое'],
};
const SOURCE_VALUES = ['salary', 'business', 'investment', 'savings', 'other'];

const labels = {
  he: {
    title: 'הגשת בקשת KYC', personalInfo: 'פרטים אישיים',
    dob: 'תאריך לידה', idType: 'סוג מסמך זהות',
    idTypeIL: 'ת.ז. ישראלית', idTypePassport: 'דרכון',
    idNumber: 'מספר ת.ז./דרכון', city: 'עיר', country: 'מדינה',
    sourceOfFunds: 'מקור הכנסה', submit: 'הגש לבדיקה', loading: 'שולח...',
    success: 'הבקשה הוגשה בהצלחה!', error: 'שגיאה. נסה שוב.',
    docNote: 'הגשת הבקשה תישלח לצוות לאימות. תקבל עדכון תוך 1-3 ימי עסקים.',
  },
  ru: {
    title: 'Подача заявки KYC', personalInfo: 'Личные данные',
    dob: 'Дата рождения', idType: 'Тип документа',
    idTypeIL: 'Израильское удостоверение (Теудат Зеут)', idTypePassport: 'Паспорт',
    idNumber: 'Номер удостоверения / паспорта', city: 'Город', country: 'Страна',
    sourceOfFunds: 'Источник доходов', submit: 'Подать на проверку', loading: 'Отправка...',
    success: 'Заявка успешно подана!', error: 'Ошибка. Попробуйте снова.',
    docNote: 'Заявка будет отправлена команде на проверку. Вы получите ответ в течение 1-3 рабочих дней.',
  },
};

const inp = {
  width: '100%', height: 46, padding: '0 14px',
  background: 'rgba(255,255,255,0.06)',
  border: '1.5px solid rgba(255,255,255,0.12)',
  borderRadius: 10, color: 'white', fontSize: 14,
  outline: 'none', boxSizing: 'border-box' as const,
  fontFamily: 'inherit',
};
const lbl = {
  display: 'block' as const, color: '#94a3b8',
  fontSize: 12, fontWeight: 700, letterSpacing: 0.3,
  marginBottom: 8, textTransform: 'uppercase' as const,
};

export function KycForm({ locale, existingProfile }: Props) {
  const L = labels[locale as 'he' | 'ru'] ?? labels.he;
  const router = useRouter();
  const isRtl = locale === 'he';

  const [form, setForm] = useState({
    dateOfBirth: existingProfile?.dateOfBirth ?? '',
    idType: 'IL_ID',
    idNumber: '',
    city: existingProfile?.city ?? '',
    country: existingProfile?.country ?? 'IL',
    sourceOfFunds: existingProfile?.sourceOfFunds ?? 'salary',
    sourceOfFundsNote: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? L.error); return; }
      setSuccess(true);
      setTimeout(() => router.refresh(), 1500);
    } catch { setError(L.error); } finally { setLoading(false); }
  }

  if (success) {
    return (
      <div style={{
        background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.25)',
        borderRadius: 20, padding: '48px 24px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <p style={{ color: '#34d399', fontWeight: 700, fontSize: 16 }}>{L.success}</p>
      </div>
    );
  }

  const sourceOpts = SOURCE_OPTIONS[locale as 'he' | 'ru'] ?? SOURCE_OPTIONS.he;
  const dir = isRtl ? 'rtl' : 'ltr';

  return (
    <form
      onSubmit={handleSubmit}
      dir={dir}
      style={{
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 20, padding: '24px',
        display: 'flex', flexDirection: 'column', gap: 18,
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      <h2 style={{ color: 'white', fontWeight: 700, fontSize: 16, margin: 0 }}>{L.title}</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={{ ...lbl, textAlign: isRtl ? 'right' : 'left' }}>{L.dob}</label>
          <input type="date" value={form.dateOfBirth} onChange={e => update('dateOfBirth', e.target.value)}
            required style={{ ...inp, textAlign: isRtl ? 'right' : 'left' }} />
        </div>
        <div>
          <label style={{ ...lbl, textAlign: isRtl ? 'right' : 'left' }}>{L.idType}</label>
          <select value={form.idType} onChange={e => update('idType', e.target.value)}
            style={{ ...inp, cursor: 'pointer' }}>
            <option value="IL_ID" style={{ background: '#0f172a' }}>{L.idTypeIL}</option>
            <option value="PASSPORT" style={{ background: '#0f172a' }}>{L.idTypePassport}</option>
          </select>
        </div>
      </div>

      <div>
        <label style={{ ...lbl, textAlign: isRtl ? 'right' : 'left' }}>{L.idNumber}</label>
        <input type="text" value={form.idNumber} onChange={e => update('idNumber', e.target.value)}
          required style={inp} placeholder="000000000" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={{ ...lbl, textAlign: isRtl ? 'right' : 'left' }}>{L.city}</label>
          <input type="text" value={form.city} onChange={e => update('city', e.target.value)}
            required style={inp} />
        </div>
        <div>
          <label style={{ ...lbl, textAlign: isRtl ? 'right' : 'left' }}>{L.country}</label>
          <input type="text" value={form.country} onChange={e => update('country', e.target.value)}
            required style={inp} />
        </div>
      </div>

      <div>
        <label style={{ ...lbl, textAlign: isRtl ? 'right' : 'left' }}>{L.sourceOfFunds}</label>
        <select value={form.sourceOfFunds} onChange={e => update('sourceOfFunds', e.target.value)}
          style={{ ...inp, cursor: 'pointer' }}>
          {SOURCE_VALUES.map((v, i) => (
            <option key={v} value={v} style={{ background: '#0f172a' }}>{sourceOpts[i]}</option>
          ))}
        </select>
      </div>

      {form.sourceOfFunds === 'other' && (
        <div>
          <label style={{ ...lbl, textAlign: isRtl ? 'right' : 'left' }}>
            {locale === 'he' ? 'פרט מקור הכנסה' : 'Укажите источник доходов'}
          </label>
          <input type="text" value={form.sourceOfFundsNote}
            onChange={e => update('sourceOfFundsNote', e.target.value)} style={inp} />
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 10,
          background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
          color: '#fca5a5', fontSize: 13,
        }}>
          ⚠️ {error}
        </div>
      )}

      <button type="submit" disabled={loading} style={{
        height: 50, background: loading ? 'rgba(59,130,246,0.4)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        border: 'none', borderRadius: 12, color: 'white', fontSize: 14, fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
      }}>
        {loading ? L.loading : L.submit}
      </button>

      <p style={{ color: '#475569', fontSize: 12, margin: 0, textAlign: isRtl ? 'right' : 'left' }}>{L.docNote}</p>
    </form>
  );
}
