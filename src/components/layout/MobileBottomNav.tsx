'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Props {
  locale: string;
  userRole: string;
}

export function MobileBottomNav({ locale, userRole }: Props) {
  const pathname = usePathname();
  const isAdmin = userRole === 'admin' || userRole === 'finance_operator' || userRole === 'compliance_officer';

  const items = locale === 'he'
    ? [
        { href: `/${locale}/dashboard`,  label: 'בית',    icon: '🏠' },
        { href: `/${locale}/orders/new`, label: 'חדש',    icon: '➕' },
        { href: `/${locale}/orders`,     label: 'הזמנות', icon: '📋' },
        ...(isAdmin ? [{ href: `/${locale}/admin`, label: 'ניהול', icon: '🛡️' }] : []),
        { href: `/${locale}/kyc`,        label: 'KYC',    icon: '🪪' },
      ]
    : [
        { href: `/${locale}/dashboard`,  label: 'Главная', icon: '🏠' },
        { href: `/${locale}/orders/new`, label: 'Новая',   icon: '➕' },
        { href: `/${locale}/orders`,     label: 'Заявки',  icon: '📋' },
        ...(isAdmin ? [{ href: `/${locale}/admin`, label: 'Адм.', icon: '🛡️' }] : []),
        { href: `/${locale}/kyc`,        label: 'KYC',     icon: '🪪' },
      ];

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      display: 'flex', alignItems: 'stretch',
      width: '100%', maxWidth: '100vw', overflow: 'hidden',
      height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      background: 'rgba(5,10,24,0.97)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
    }}>
      {items.map(item => {
        const isActive = pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== `/${locale}/orders/new`);
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              flex: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 2,
              color: isActive ? '#60a5fa' : '#64748b',
              minHeight: 60,
              textDecoration: 'none',
              fontSize: 10, fontWeight: 600,
              transition: 'color 0.15s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
            <span style={{ marginTop: 2, letterSpacing: 0 }}>{item.label}</span>
            {isActive && (
              <span style={{
                position: 'absolute', bottom: 'env(safe-area-inset-bottom, 0px)',
                width: 24, height: 2, borderRadius: 2,
                background: '#3b82f6',
              }} />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
