'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

interface NavbarProps {
  locale: string;
  user?: { email: string } | null;
}

const labels = {
  he: { assets: 'נכסים', fees: 'עמלות', about: 'אודות', login: 'כניסה', register: 'הרשמה', dashboard: 'לוח בקרה', logout: 'יציאה' },
  ru: { assets: 'Активы', fees: 'Комиссии', about: 'О нас', login: 'Войти', register: 'Регистрация', dashboard: 'Кабинет', logout: 'Выйти' },
  en: { assets: 'Assets', fees: 'Fees', about: 'About', login: 'Login', register: 'Register', dashboard: 'Dashboard', logout: 'Logout' },
  ar: { assets: 'الأصول', fees: 'الرسوم', about: 'حولنا', login: 'دخول', register: 'تسجيل', dashboard: 'لوحة التحكم', logout: 'خروج' },
};

export function Navbar({ locale, user }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const lbl = labels[locale as keyof typeof labels] ?? labels.he;
  const isRtl = locale === 'he' || locale === 'ar';
  const altLocale = locale === 'he' ? 'ru' : 'he';

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push(`/${locale}/login`);
    router.refresh();
  }

  const navLinks = [
    { href: `/${locale}#assets`, label: lbl.assets },
    { href: `/${locale}#fees`, label: lbl.fees },
    { href: `/${locale}#about`, label: lbl.about },
  ];

  return (
    <nav dir="ltr" style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(5,12,24,0.88)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
    }}>
      <style>{`
        .nav-desktop { display: none !important; }
        .nav-mobile  { display: flex !important; }
        .nav-drawer  { display: block; }
        @media (min-width: 768px) {
          .nav-desktop { display: flex !important; }
          .nav-mobile  { display: none !important; }
          .nav-drawer  { display: none !important; }
        }
      `}</style>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>

          {/* Logo */}
          <Link href={`/${locale}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg,#1e7fff,#6b3fff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(30,127,255,0.35)',
            }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: '#fff' }}>24</span>
            </div>
            <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.5px', color: '#fff' }}>
              crypto<span style={{ background: 'linear-gradient(135deg,#1e7fff,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>24</span>
            </span>
          </Link>

          {/* Desktop centre links */}
          <div className="nav-desktop" style={{ gap: 4 }}>
            {navLinks.map(link => (
              <Link key={link.href} href={link.href} style={{
                padding: '6px 14px', borderRadius: 10, fontSize: 14, fontWeight: 500,
                color: pathname === link.href ? '#fff' : 'rgba(255,255,255,0.5)',
                textDecoration: 'none', transition: 'color 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = pathname === link.href ? '#fff' : 'rgba(255,255,255,0.5)')}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop right: lang + auth */}
          <div className="nav-desktop" style={{ alignItems: 'center', gap: 8 }}>
            <Link href={pathname.replace(`/${locale}`, `/${altLocale}`)} style={{
              padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              color: 'rgba(255,255,255,0.45)', textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.12)',
              transition: 'all 0.15s',
            }}>
              {locale === 'he' ? 'RU' : 'עב'}
            </Link>
            {user ? (
              <>
                <Link href={`/${locale}/dashboard`} style={{ padding: '6px 12px', fontSize: 14, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>
                  {user.email.split('@')[0]}
                </Link>
                <button onClick={handleLogout} style={{
                  padding: '7px 16px', borderRadius: 10, fontSize: 14, fontWeight: 500,
                  background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)',
                  border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                }}>
                  {lbl.logout}
                </button>
              </>
            ) : (
              <>
                <Link href={`/${locale}/login`} style={{ padding: '6px 14px', fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>
                  {lbl.login}
                </Link>
                <Link href={`/${locale}/register`} style={{
                  padding: '8px 20px', borderRadius: 10, fontSize: 14, fontWeight: 700,
                  background: 'linear-gradient(135deg,#1e7fff,#6b3fff)', color: '#fff',
                  textDecoration: 'none', boxShadow: '0 4px 14px rgba(30,127,255,0.3)',
                  transition: 'opacity 0.15s',
                }}>
                  {lbl.register}
                </Link>
              </>
            )}
          </div>

          {/* Mobile: lang + burger */}
          <div className="nav-mobile" style={{ alignItems: 'center', gap: 8 }}>
            <Link href={pathname.replace(`/${locale}`, `/${altLocale}`)} style={{
              padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              color: 'rgba(255,255,255,0.45)', textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.12)',
            }}>
              {locale === 'he' ? 'RU' : 'עב'}
            </Link>
            <button
              onClick={() => setOpen(o => !o)}
              style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.7)" strokeWidth={2.5}>
                {open
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div dir={isRtl ? 'rtl' : 'ltr'} className="nav-drawer" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '8px 16px 16px' }}>
          {navLinks.map(link => (
            <Link key={link.href} href={link.href}
              onClick={() => setOpen(false)}
              style={{ display: 'flex', alignItems: 'center', minHeight: 48, padding: '0 12px', borderRadius: 12, textDecoration: 'none', fontSize: 15, color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>
              {link.label}
            </Link>
          ))}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 8, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {user ? (
              <>
                <Link href={`/${locale}/dashboard`} style={{ display: 'flex', alignItems: 'center', minHeight: 48, padding: '0 12px', borderRadius: 12, textDecoration: 'none', fontSize: 15, color: 'rgba(255,255,255,0.6)' }}>
                  📊 {lbl.dashboard}
                </Link>
                <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', minHeight: 48, padding: '0 12px', borderRadius: 12, fontSize: 15, color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none', cursor: 'pointer', textAlign: isRtl ? 'right' : 'left' }}>
                  🚪 {lbl.logout}
                </button>
              </>
            ) : (
              <>
                <Link href={`/${locale}/login`} style={{ display: 'flex', alignItems: 'center', minHeight: 48, padding: '0 12px', borderRadius: 12, textDecoration: 'none', fontSize: 15, color: 'rgba(255,255,255,0.6)' }}>
                  🔑 {lbl.login}
                </Link>
                <Link href={`/${locale}/register`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: 14, textDecoration: 'none', fontSize: 15, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#1e7fff,#6b3fff)', boxShadow: '0 4px 14px rgba(30,127,255,0.3)' }}>
                  {lbl.register}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
