'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const labels = {
  he: {
    title: 'הרשמה', fullName: 'שם מלא', email: 'אימייל',
    phone: 'טלפון (אופציונלי)', password: 'סיסמה',
    passwordHint: 'מינימום 8 תווים, אות גדולה ומספר',
    country: 'מדינת מגורים',
    legalPrefix: 'אני מסכים/ה ל',
    terms: 'תנאי השימוש', and: 'ו-', privacy: 'מדיניות הפרטיות',
    submit: 'יצירת חשבון', loading: 'יוצר חשבון...', hasAccount: 'כבר יש לך חשבון?', loginLink: 'כניסה',
    errors: {
      email_taken: 'כתובת האימייל כבר רשומה במערכת',
      password_weak: 'הסיסמה חייבת לכלול לפחות 8 תווים, אות גדולה ומספר',
      legal: 'חובה לאשר את תנאי השימוש',
      generic: 'שגיאה. נסה שוב.',
    },
  },
  ru: {
    title: 'Регистрация', fullName: 'Полное имя', email: 'Email',
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

    if (!legalAccepted) {
      setError(lbl.errors.legal);
      return;
    }

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
        if (data.error?.includes('EMAIL_TAKEN') || res.status === 409) {
          setError(lbl.errors.email_taken);
        } else if (data.error?.includes('PASSWORD') || data.error?.includes('password')) {
          setError(lbl.errors.password_weak);
        } else {
          setError(lbl.errors.generic);
        }
        return;
      }

      // Registration successful — redirect to dashboard (auto-logged in)
      router.push(`/${locale}/dashboard`);
      router.refresh();
    } catch {
      setError(lbl.errors.generic);
    } finally {
      setLoading(false);
    }
  }

  const inputClass = `w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary ${isRtl ? 'text-right' : ''}`;
  const labelClass = `mb-1.5 block text-sm text-muted-foreground ${isRtl ? 'text-right' : ''}`;

  return (
    <div className="w-full max-w-md">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-[#0E1929]/80 p-8 shadow-2xl backdrop-blur-2xl border border-white/10">
        {/* Modern Accent Glow */}
        <div className="absolute -right-20 -top-20 h-64 w-64 bg-primary/20 blur-[100px] pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 h-64 w-64 bg-accent/10 blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 w-full">
          <div className="mb-10">
            <h1 className={`text-4xl font-black text-white tracking-tighter ${isRtl ? 'text-right' : ''}`}>
              {lbl.title}
            </h1>
            <p className={`mt-2 text-sm text-blue-400 font-medium ${isRtl ? 'text-right' : ''}`}>
              {isRtl ? 'הצטרף למערכת המסחר המתקדמת' : 'Join our advanced trading portal'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-5">
              {/* Full Name */}
              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-wider text-muted-foreground/80 block ${isRtl ? 'text-right' : ''}`}>{lbl.fullName}</label>
                <div className="relative group">
                  <span className={`absolute top-1/2 -translate-y-1/2 text-lg pointer-events-none transition-all group-focus-within:text-primary ${isRtl ? 'right-4' : 'left-4'}`}>👤</span>
                  <input 
                    type="text" 
                    value={form.fullName} 
                    onChange={e => update('fullName', e.target.value)}
                    required 
                    className={`h-14 w-full rounded-2xl border border-white/10 bg-[#050C18]/60 px-4 text-sm text-white outline-none transition-all placeholder:text-muted-foreground/30 focus:border-primary focus:ring-4 focus:ring-primary/10 ${isRtl ? 'pr-12 text-right' : 'pl-12'}`} 
                    autoComplete="name" 
                    placeholder="ישראל ישראלי"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email */}
                <div className="space-y-2">
                  <label className={`text-xs font-bold uppercase tracking-wider text-muted-foreground/80 block ${isRtl ? 'text-right' : ''}`}>{lbl.email}</label>
                  <div className="relative group">
                    <span className={`absolute top-1/2 -translate-y-1/2 text-lg pointer-events-none transition-all group-focus-within:text-primary ${isRtl ? 'right-4' : 'left-4'}`}>📧</span>
                    <input 
                      type="email" 
                      value={form.email} 
                      onChange={e => update('email', e.target.value)}
                      required 
                      className={`h-14 w-full rounded-2xl border border-white/10 bg-[#050C18]/60 px-4 text-sm text-white outline-none transition-all placeholder:text-muted-foreground/30 focus:border-primary focus:ring-4 focus:ring-primary/10 ${isRtl ? 'pr-12 text-right' : 'pl-12'}`} 
                      autoComplete="email" 
                      placeholder="name@mail.com" 
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <label className={`text-xs font-bold uppercase tracking-wider text-muted-foreground/80 block ${isRtl ? 'text-right' : ''}`}>{lbl.phone}</label>
                  <div className="relative group">
                    <span className={`absolute top-1/2 -translate-y-1/2 text-lg pointer-events-none transition-all group-focus-within:text-primary ${isRtl ? 'right-4' : 'left-4'}`}>📱</span>
                    <input 
                      type="tel" 
                      value={form.phone} 
                      onChange={e => update('phone', e.target.value)}
                      className={`h-14 w-full rounded-2xl border border-white/10 bg-[#050C18]/60 px-4 text-sm text-white outline-none transition-all placeholder:text-muted-foreground/30 focus:border-primary focus:ring-4 focus:ring-primary/10 ${isRtl ? 'pr-12 text-right' : 'pl-12'}`} 
                      placeholder="+972..." 
                    />
                  </div>
                </div>
              </div>

              {/* Country */}
              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-wider text-muted-foreground/80 block ${isRtl ? 'text-right' : ''}`}>{lbl.country}</label>
                <div className="relative group">
                  <span className={`absolute top-1/2 -translate-y-1/2 text-lg pointer-events-none transition-all group-focus-within:text-primary ${isRtl ? 'right-4' : 'left-4'}`}>🌍</span>
                  <select
                    value={form.residencyCountry}
                    onChange={e => update('residencyCountry', e.target.value)}
                    className={`h-14 w-full rounded-2xl border border-white/10 bg-[#050C18]/60 px-4 text-sm text-white outline-none transition-all appearance-none cursor-pointer focus:border-primary focus:ring-4 focus:ring-primary/10 ${isRtl ? 'pr-12 text-right' : 'pl-12'}`}
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code} className="bg-[#0E1929] text-white">
                        {locale === 'he' ? c.he : c.ru}
                      </option>
                    ))}
                  </select>
                  <span className={`absolute top-1/2 -translate-y-1/2 pointer-events-none opacity-50 ${isRtl ? 'left-4' : 'right-4'}`}>▼</span>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-wider text-muted-foreground/80 block ${isRtl ? 'text-right' : ''}`}>{lbl.password}</label>
                <div className="relative group">
                  <span className={`absolute top-1/2 -translate-y-1/2 text-lg pointer-events-none transition-all group-focus-within:text-primary ${isRtl ? 'right-4' : 'left-4'}`}>🔒</span>
                  <input 
                    type="password" 
                    value={form.password} 
                    onChange={e => update('password', e.target.value)}
                    required 
                    className={`h-14 w-full rounded-2xl border border-white/10 bg-[#050C18]/60 px-4 text-sm text-white outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 ${isRtl ? 'pr-12 text-right' : 'pl-12'}`} 
                    autoComplete="new-password" 
                  />
                </div>
                <p className={`text-[10px] font-medium text-muted-foreground/50 italic ${isRtl ? 'text-right' : ''}`}>
                  {lbl.passwordHint}
                </p>
              </div>
            </div>

            {/* Legal */}
            <div className={`flex items-start gap-3 rounded-2xl bg-white/5 p-4 border border-white/5 transition-all hover:bg-white/10 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <input
                type="checkbox"
                id="legal"
                checked={legalAccepted}
                onChange={e => setLegalAccepted(e.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-white/20 bg-white/5 accent-primary cursor-pointer shadow-inner"
              />
              <label htmlFor="legal" className={`text-xs text-muted-foreground leading-relaxed cursor-pointer select-none ${isRtl ? 'text-right' : ''}`}>
                {lbl.legalPrefix}
                <Link href={`/${locale}/legal`} className="text-primary font-bold hover:underline mx-1">{lbl.terms}</Link>
                {lbl.and}
                <Link href={`/${locale}/legal`} className="text-primary font-bold hover:underline mx-1">{lbl.privacy}</Link>
              </label>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100 flex items-center gap-3 animate-slide-up">
                <span className="text-lg">❕</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative h-14 w-full overflow-hidden rounded-2xl gradient-brand text-sm font-black text-white uppercase tracking-widest shadow-2xl shadow-primary/20 transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:scale-100"
            >
              <span className="relative z-10">{loading ? lbl.loading : lbl.submit}</span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full"></div>
            </button>
          </form>

          <div className="mt-10 border-t border-white/5 pt-6 text-center">
            <p className="text-sm font-bold text-muted-foreground">
              {lbl.hasAccount}{' '}
              <Link href={`/${locale}/login`} className="text-primary hover:text-blue-400 transition-colors ml-1">
                {lbl.loginLink}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
