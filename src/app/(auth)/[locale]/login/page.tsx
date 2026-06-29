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
    tabEmail: 'אימייל', tabPhone: 'טלפון',
    phone: 'מספר טלפון', phonePlaceholder: '+972501234567',
    code: 'קוד אימות', codePlaceholder: '______',
    sendCode: 'שלח קוד', sending: 'שולח...',
    verify: 'אימות וכניסה', verifying: 'מאמת...',
    resend: 'שלח קוד מחדש', changeNumber: 'שינוי מספר',
    error: {
      invalid: 'אימייל או סיסמה שגויים', suspended: 'החשבון מושהה', generic: 'שגיאה. נסה שוב.',
      otpInvalid: 'קוד שגוי', otpExpired: 'הקוד פג תוקף, שלח קוד חדש', rateLimited: 'יותר מדי ניסיונות, נסה שוב מאוחר יותר',
    },
  },
  ru: {
    title: 'Вход в аккаунт',
    subtitle: 'Добро пожаловать',
    email: 'Email', password: 'Пароль',
    submit: 'Войти', loading: 'Вход...',
    noAccount: 'Нет аккаунта?', registerLink: 'Зарегистрироваться',
    tabEmail: 'Email', tabPhone: 'Телефон',
    phone: 'Номер телефона', phonePlaceholder: '+972501234567',
    code: 'Код подтверждения', codePlaceholder: '______',
    sendCode: 'Отправить код', sending: 'Отправка...',
    verify: 'Подтвердить и войти', verifying: 'Проверка...',
    resend: 'Отправить код повторно', changeNumber: 'Изменить номер',
    error: {
      invalid: 'Неверный email или пароль', suspended: 'Аккаунт заблокирован', generic: 'Ошибка. Попробуйте снова.',
      otpInvalid: 'Неверный код', otpExpired: 'Код истёк, запросите новый', rateLimited: 'Слишком много попыток, попробуйте позже',
    },
  },
};

export default function LoginPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const lbl = labels[locale as 'he' | 'ru'] ?? labels.he;
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? `/${locale}/dashboard`;

  const [mode, setMode] = useState<'email' | 'phone'>('email');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function mapError(data: { error?: string }, status: number) {
    if (status === 401) return lbl.error.invalid;
    if (status === 429) return lbl.error.rateLimited;
    if (data.error?.includes('suspended')) return lbl.error.suspended;
    return lbl.error.generic;
  }

  async function handleEmailSubmit(e: React.FormEvent) {
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
        setError(mapError(data, res.status));
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

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/phone/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(res.status === 429 ? lbl.error.rateLimited : lbl.error.generic);
        return;
      }
      setOtpSent(true);
    } catch {
      setError(lbl.error.generic);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 410) setError(lbl.error.otpExpired);
        else if (res.status === 401) setError(lbl.error.otpInvalid);
        else if (res.status === 429) setError(lbl.error.rateLimited);
        else setError(lbl.error.generic);
        return;
      }
      router.push(data.data?.needsProfileCompletion ? `/${locale}/complete-profile` : redirect);
      router.refresh();
    } catch {
      setError(lbl.error.generic);
    } finally {
      setLoading(false);
    }
  }

  const isRtl = locale === 'he';

  const inputStyle: React.CSSProperties = {
    width: '100%', height: '48px', padding: '0 16px',
    background: 'rgba(255,255,255,0.08)',
    border: '1.5px solid rgba(255,255,255,0.2)',
    borderRadius: '12px',
    color: 'white', fontSize: '15px',
    outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', color: '#cbd5e1', fontSize: '13px', fontWeight: '600', marginBottom: '8px',
  };

  const submitStyle = (disabled: boolean): React.CSSProperties => ({
    width: '100%', height: '50px',
    background: disabled ? 'rgba(59,130,246,0.5)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    border: 'none', borderRadius: '14px',
    color: 'white', fontSize: '15px', fontWeight: '700',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit', letterSpacing: '0.3px',
    transition: 'opacity 0.2s',
  });

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

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', marginTop: '24px' }}>
            {(['email', 'phone'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(''); setOtpSent(false); }}
                style={{
                  flex: 1, height: '40px', borderRadius: '10px',
                  border: mode === m ? '1.5px solid #3b82f6' : '1.5px solid rgba(255,255,255,0.15)',
                  background: mode === m ? 'rgba(59,130,246,0.15)' : 'transparent',
                  color: mode === m ? '#93c5fd' : '#94a3b8',
                  fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {m === 'email' ? lbl.tabEmail : lbl.tabPhone}
              </button>
            ))}
          </div>

          {mode === 'email' && (
            <form onSubmit={handleEmailSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>{lbl.email}</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
                />
              </div>

              <div style={{ marginBottom: '28px' }}>
                <label style={labelStyle}>{lbl.password}</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
                />
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

              <button type="submit" disabled={loading} style={submitStyle(loading)}>
                {loading ? lbl.loading : lbl.submit}
              </button>
            </form>
          )}

          {mode === 'phone' && !otpSent && (
            <form onSubmit={handleSendCode}>
              <div style={{ marginBottom: '28px' }}>
                <label style={labelStyle}>{lbl.phone}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  autoComplete="tel"
                  placeholder={lbl.phonePlaceholder}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
                />
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

              <button type="submit" disabled={loading} style={submitStyle(loading)}>
                {loading ? lbl.sending : lbl.sendCode}
              </button>
            </form>
          )}

          {mode === 'phone' && otpSent && (
            <form onSubmit={handleVerifyCode}>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>{lbl.code}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  placeholder={lbl.codePlaceholder}
                  style={{ ...inputStyle, letterSpacing: '4px', textAlign: 'center' }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <button
                  type="button"
                  onClick={() => { setOtpSent(false); setCode(''); setError(''); }}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '13px', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                >
                  {lbl.changeNumber}
                </button>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={loading}
                  style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '13px', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontWeight: 600 }}
                >
                  {lbl.resend}
                </button>
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

              <button type="submit" disabled={loading} style={submitStyle(loading)}>
                {loading ? lbl.verifying : lbl.verify}
              </button>
            </form>
          )}

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
