'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface SidebarProps {
  locale: string;
  userEmail: string;
  userRole: string;
}

const navItems: Record<string, { href: string; label: string; icon: string; roles?: string[] }[]> = {
  he: [
    { href: 'dashboard',  label: 'לוח בקרה',        icon: '📊' },
    { href: 'orders/new', label: 'הזמנה חדשה',      icon: '➕' },
    { href: 'orders',     label: 'ההזמנות שלי',     icon: '📋' },
    { href: 'wallets',    label: 'ארנקים',           icon: '💼' },
    { href: 'kyc',        label: 'אימות זהות',       icon: '🪪' },
    { href: 'notifications', label: 'התראות',        icon: '🔔' },
    { href: 'payment-methods', label: 'תשלומים',     icon: '💳' },
    { href: 'settings',   label: 'הגדרות',           icon: '⚙️' },
    { href: 'admin',      label: 'פאנל ניהול',      icon: '🛡️', roles: ['admin','finance_operator','compliance_officer'] },
  ],
  ru: [
    { href: 'dashboard',  label: 'Кабинет',          icon: '📊' },
    { href: 'orders/new', label: 'Новая заявка',     icon: '➕' },
    { href: 'orders',     label: 'Мои заявки',       icon: '📋' },
    { href: 'wallets',    label: 'Кошельки',         icon: '💼' },
    { href: 'kyc',        label: 'Верификация',      icon: '🪪' },
    { href: 'notifications', label: 'Уведомления',   icon: '🔔' },
    { href: 'payment-methods', label: 'Платежи',     icon: '💳' },
    { href: 'settings',   label: 'Настройки',        icon: '⚙️' },
    { href: 'admin',      label: 'Панель управления',icon: '🛡️', roles: ['admin','finance_operator','compliance_officer'] },
  ],
};

export function DashboardSidebar({ locale, userEmail, userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isRtl = locale === 'he';
  const allItems = navItems[locale as 'he' | 'ru'] ?? navItems.he;
  const items = allItems.filter(i => !i.roles || i.roles.includes(userRole));

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push(`/${locale}/login`);
    router.refresh();
  }

  return (
    <aside style={{
      width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column',
      height: '100vh',
      background: '#070d1a',
      borderRight: isRtl ? 'none' : '1px solid rgba(255,255,255,0.07)',
      borderLeft: isRtl ? '1px solid rgba(255,255,255,0.07)' : 'none',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>

      {/* Logo */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <Link href={`/${locale}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flexDirection: isRtl ? 'row-reverse' : 'row' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: 'white', flexShrink: 0,
          }}>₿</div>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'white', letterSpacing: '-0.3px' }}>crypto24</span>
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
        {items.map(item => {
          const href = `/${locale}/${item.href}`;
          const isActive = pathname === href || (pathname.startsWith(href + '/') && item.href !== 'orders');
          return (
            <Link key={item.href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              flexDirection: isRtl ? 'row-reverse' : 'row',
              padding: '9px 12px', borderRadius: 10,
              marginBottom: 2, textDecoration: 'none',
              fontSize: 14, fontWeight: isActive ? 600 : 500,
              background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
              color: isActive ? '#60a5fa' : '#94a3b8',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = '#e2e8f0'; } }}
            onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#94a3b8'; } }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexDirection: isRtl ? 'row-reverse' : 'row', padding: '8px 12px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(59,130,246,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#60a5fa',
          }}>
            {userEmail[0].toUpperCase()}
          </div>
          <span style={{ flex: 1, fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userEmail}
          </span>
          <button onClick={handleLogout} title={locale === 'he' ? 'יציאה' : 'Выйти'} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#475569', padding: 4, borderRadius: 6, flexShrink: 0,
            fontSize: 16, lineHeight: 1,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#475569'; }}
          >→</button>
        </div>
      </div>
    </aside>
  );
}
