'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const labels = {
  he: {
    title: 'השלמת פרופיל', subtitle: 'עוד כמה פרטים לפני שממשיכים',
    phone: 'טלפון', country: 'מדינת מגורים',
    submit: 'המשך', loading: 'שומר...',
    errors: { generic: 'שגיאה. נסה שוב.' },
  },
  ru: {
    title: 'Завершите профиль', subtitle: 'Ещё немного данных перед тем, как продолжить',
    phone: 'Телефон', country: 'Страна проживания',
    submit: 'Продолжить', loading: 'Сохранение...',
    errors: { generic: 'Ошибка. Попробуйте снова.' },
  },
};

const COUNTRIES = [
  { code: 'IL', he: 'ישראל', ru: 'Израиль' },
  { code: 'US', he: 'ארצות הברית', ru: 'США' },
  { code: 'RU', he: 'רוסיה', ru: 'Россия' },
  { code: 'UA', he: 'אוקראינה', ru: 'Украина' },
  { code: 'DE', he: 'גרמניה', ru: 'Германия' },
  { code: 'GB', he: 'בריטניה', ru: 'Великобритания' },
  { code: 'OTHER', he: 'אחר', ru: 'Другая' },
];

const inputStyle = {
  width: '100%', height: '48px', padding: '0 16px',
  background: 'rgba(255,255,255,0.08)',
  border: '1.5px solid rgba(255,255,255,0.2)',
  borderRadius: '12px',
  color: 'white', fontSize: '15px',
  outline: 'none', boxSizing: 'border-box' as const,
  fontFamily: 'inherit',
};

const labelStyle = {
  display: 'block' as const,
  color: '#cbd5e1', fontSize: '13px', fontWeight: '600' as const,
  marginBottom: '8px',
};

export default function CompleteProfilePage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const lbl = labels[locale as 'he' | 'ru'] ?? labels.he;
  const isRtl = locale === 'he';
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [residencyCountry, setResidencyCountry] = useState('IL');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/complete-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, residencyCountry }),
      });
      if (!res.ok) { setError(lbl.errors.generic); return; }
      router.push(`/${locale}/dashboard`);
      router.refresh();
    } catch {
      setError(lbl.errors.generic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '24px', padding: '40px 36px', backdropFilter: 'blur(20px)',
        }}>
          <h1 style={{ color: 'white', fontSize: '26px', fontWeight: '700', marginBottom: '6px', marginTop: 0 }}>
            {lbl.title}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '32px', marginTop: 0 }}>
            {lbl.subtitle}
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>{lbl.phone}</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                autoComplete="tel"
                placeholder="+972..."
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={labelStyle}>{lbl.country}</label>
              <select
                value={residencyCountry}
                onChange={e => setResidencyCountry(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code} style={{ background: '#0f172a', color: 'white' }}>
                    {locale === 'he' ? c.he : c.ru}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: '12px', padding: '12px 16px', marginBottom: '20px',
                color: '#fca5a5', fontSize: '14px',
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', height: '50px',
                background: loading ? 'rgba(59,130,246,0.5)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                border: 'none', borderRadius: '14px',
                color: 'white', fontSize: '15px', fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', letterSpacing: '0.3px',
              }}
            >
              {loading ? lbl.loading : lbl.submit}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
