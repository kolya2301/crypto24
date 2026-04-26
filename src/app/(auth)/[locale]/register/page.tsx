'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const labels = {
  he: {
    title: 'הרשמה', subtitle: 'הצטרף למערכת המסחר',
    fullName: 'שם מלא', email: 'אימייל',
    phone: 'טלפון (אופציונלי)', password: 'סיסמה',
    passwordHint: 'מינימום 8 תווים, אות גדולה ומספר',
    country: 'מדינת מגורים',
    legalPrefix: 'אני מסכים/ה ל',
    terms: 'תנאי השימוש', and: ' ו-', privacy: 'מדיניות הפרטיות',
    submit: 'יצירת חשבון', loading: 'יוצר חשבון...', hasAccount: 'כבר יש לך חשבון?', loginLink: 'כניסה',
    errors: {
      email_taken: 'כתובת האימייל כבר רשומה במערכת',
      password_weak: 'הסיסמה חייבת לכלול לפחות 8 תווים, אות גדולה ומספר',
      legal: 'חובה לאשר את תנאי השימוש',
      generic: 'שגיאה. נסה שוב.',
    },
  },
  ru: {
    title: 'Регистрация', subtitle: 'Создайте аккаунт для торговли',
    fullName: 'Полное имя', email: 'Email',
    phone: 'Телефон (необязательно)', password: 'Пароль',
    passwordHint: 'Минимум 8 символов, заглавная буква и цифра',
    country: 'Страна проживания',
    legalPrefix: 'Я согласен(на) с ',
    terms: 'условиями использования', and: ' и ', privacy: 'политикой конфиденциальности',
    submit: 'Создать аккаунт', loading: 'Создание аккаунта...', hasAccount: 'Уже есть аккаунт?', loginLink: 'Войти',
    errors: {
      email_taken: 'Этот email уже зарегистрирован',
      password_weak: 'Пароль должен содержать минимум 8 символов, заглавную букву и цифру',
      legal: 'Необходимо принять условия использования',
      generic: 'Ошибка. Попробуйте снова.',
    },
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

export default function RegisterPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const lbl = labels[locale as 'he' | 'ru'] ?? labels.he;
  const router = useRouter();
  const isRtl = locale === 'he';

  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '', residencyCountry: 'IL',
  });
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!legalAccepted) { setError(lbl.errors.legal); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password,
          residencyCountry: form.residencyCountry,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes('EMAIL_TAKEN') || res.status === 409) setError(lbl.errors.email_taken);
        else if (data.error?.includes('PASSWORD') || data.error?.includes('password')) setError(lbl.errors.password_weak);
        else setError(lbl.errors.generic);
        return;
      }
      router.push(`/${locale}/dashboard`);
      router.refresh();
    } catch {
      setError(lbl.errors.generic);
    } finally {
      setLoading(false);
    }
  }

  function focusBorder(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    e.target.style.borderColor = '#3b82f6';
  }
  function blurBorder(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    e.target.style.borderColor = 'rgba(255,255,255,0.2)';
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div style={{ width: '100%', maxWidth: '460px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            marginBottom: '16px', fontSize: '24px', fontWeight: 'bold', color: 'white',
          }}>₿</div>
          <div style={{ color: 'white', fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>
            crypto24
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '24px',
          padding: '40px 36px',
          backdropFilter: 'blur(20px)',
        }}>
          <h1 style={{ color: 'white', fontSize: '26px', fontWeight: '700', marginBottom: '6px', marginTop: 0 }}>
            {lbl.title}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '32px', marginTop: 0 }}>
            {lbl.subtitle}
          </p>

          <form onSubmit={handleSubmit}>
            {/* Full Name */}
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>{lbl.fullName}</label>
              <input
                type="text"
                value={form.fullName}
                onChange={e => update('fullName', e.target.value)}
                required
                autoComplete="name"
                placeholder={isRtl ? 'ישראל ישראלי' : 'Иван Иванов'}
                style={inputStyle}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
            </div>

            {/* Email + Phone row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>{lbl.email}</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="name@mail.com"
                  style={inputStyle}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                />
              </div>
              <div>
                <label style={labelStyle}>{lbl.phone}</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => update('phone', e.target.value)}
                  autoComplete="tel"
                  placeholder="+972..."
                  style={inputStyle}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                />
              </div>
            </div>

            {/* Country */}
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>{lbl.country}</label>
              <select
                value={form.residencyCountry}
                onChange={e => update('residencyCountry', e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
                onFocus={focusBorder}
                onBlur={blurBorder}
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code} style={{ background: '#0f172a', color: 'white' }}>
                    {locale === 'he' ? c.he : c.ru}
                  </option>
                ))}
              </select>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '28px' }}>
              <label style={labelStyle}>{lbl.password}</label>
              <input
                type="password"
                value={form.password}
                onChange={e => update('password', e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                style={inputStyle}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
              <p style={{ color: '#475569', fontSize: '12px', marginTop: '6px', marginBottom: 0 }}>
                {lbl.passwordHint}
              </p>
            </div>

            {/* Legal */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '12px',
              flexDirection: isRtl ? 'row-reverse' : 'row',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px', padding: '14px 16px', marginBottom: '20px',
            }}>
              <input
                type="checkbox"
                id="legal"
                checked={legalAccepted}
                onChange={e => setLegalAccepted(e.target.checked)}
                style={{ marginTop: '2px', width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0, accentColor: '#3b82f6' }}
              />
              <label htmlFor="legal" style={{ color: '#94a3b8', fontSize: '13px', cursor: 'pointer', lineHeight: '1.5' }}>
                {lbl.legalPrefix}
                <Link href={`/${locale}/legal`} style={{ color: '#60a5fa', fontWeight: '600', textDecoration: 'none' }}>
                  {lbl.terms}
                </Link>
                {lbl.and}
                <Link href={`/${locale}/legal`} style={{ color: '#60a5fa', fontWeight: '600', textDecoration: 'none' }}>
                  {lbl.privacy}
                </Link>
              </label>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: '12px', padding: '12px 16px', marginBottom: '20px',
                color: '#fca5a5', fontSize: '14px',
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Submit */}
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
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => { if (!loading) (e.target as HTMLElement).style.opacity = '0.9'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.opacity = '1'; }}
            >
              {loading ? lbl.loading : lbl.submit}
            </button>
          </form>

          {/* Login link */}
          <p style={{ textAlign: 'center', marginTop: '24px', marginBottom: 0, color: '#94a3b8', fontSize: '14px' }}>
            {lbl.hasAccount}{' '}
            <Link href={`/${locale}/login`} style={{ color: '#60a5fa', fontWeight: '600', textDecoration: 'none' }}>
              {lbl.loginLink}
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: '24px', color: '#475569', fontSize: '12px' }}>
          {isRtl ? 'מוסדר ומאובטח · כל הזכויות שמורות' : 'Регулируется и защищён · Все права защищены'}
        </p>
      </div>
    </div>
  );
}
