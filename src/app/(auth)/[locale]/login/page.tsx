'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import OAuthButtons from '../oauth-buttons';

const labels = {
  he: {
    title: 'כניסה לחשבון',
    subtitle: 'ברוך הבא חזרה',
    email: 'אימייל', password: 'סיסמה',
    submit: 'כניסה', loading: 'מתחבר...',
    noAccount: 'אין לך חשבון?', registerLink: 'הרשמה',
    error: { invalid: 'אימייל או סיסמה שגויים', suspended: 'החשבון מושהה', generic: 'שגיאה. נסה שוב.' },
  },
  ru: {
    title: 'Вход в аккаунт',
    subtitle: 'Добро пожаловать',
    email: 'Email', password: 'Пароль',
    submit: 'Войти', loading: 'Вход...',
    noAccount: 'Нет аккаунта?', registerLink: 'Зарегистрироваться',
    error: { invalid: 'Неверный email или пароль', suspended: 'Аккаунт заблокирован', generic: 'Ошибка. Попробуйте снова.' },
  },
};

export default function LoginPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const lbl = labels[locale as 'he' | 'ru'] ?? labels.he;
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? `/${locale}/dashboard`;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) setError(lbl.error.invalid);
        else if (data.error?.includes('suspended')) setError(lbl.error.suspended);
        else setError(lbl.error.generic);
        return;
      }
      router.push(redirect);
      router.refresh();
    } catch {
      setError(lbl.error.generic);
    } finally {
      setLoading(false);
    }
  }

  const isRtl = locale === 'he';

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
      <div style={{ width: '100%', maxWidth: '420px' }}>
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

          <OAuthButtons locale={locale} />

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
                {lbl.email}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="name@example.com"
                style={{
                  width: '100%', height: '48px', padding: '0 16px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1.5px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: 'white', fontSize: '15px',
                  outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
                {lbl.password}
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  width: '100%', height: '48px', padding: '0 16px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1.5px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: 'white', fontSize: '15px',
                  outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
              />
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

          {/* Register link */}
          <p style={{ textAlign: 'center', marginTop: '24px', marginBottom: 0, color: '#94a3b8', fontSize: '14px' }}>
            {lbl.noAccount}{' '}
            <Link href={`/${locale}/register`} style={{ color: '#60a5fa', fontWeight: '600', textDecoration: 'none' }}>
              {lbl.registerLink}
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
