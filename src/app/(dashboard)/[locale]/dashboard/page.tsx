import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

const STATUS_LABELS: Record<string, Record<string, string>> = {
  he: {
    draft: 'טיוטה', submitted: 'הוגש', pending_review: 'בבדיקה',
    awaiting_payment: 'ממתין לתשלום', payment_received: 'תשלום התקבל',
    awaiting_crypto: 'ממתין לקריפטו', crypto_received: 'קריפטו התקבל',
    payout_in_progress: 'תשלום בתהליך', completed: 'הושלם',
    rejected: 'נדחה', cancelled: 'בוטל', on_hold: 'מעוכב', expired: 'פג תוקף', pending_kyc: 'ממתין KYC',
  },
  ru: {
    draft: 'Черновик', submitted: 'Отправлено', pending_review: 'На проверке',
    awaiting_payment: 'Ожидает оплаты', payment_received: 'Оплата получена',
    awaiting_crypto: 'Ожидает крипто', crypto_received: 'Крипто получено',
    payout_in_progress: 'Выплата', completed: 'Завершено',
    rejected: 'Отклонено', cancelled: 'Отменено', on_hold: 'На удержании', expired: 'Истёк', pending_kyc: 'Ожидает KYC',
  },
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#64748b', submitted: '#60a5fa', pending_review: '#fbbf24',
  awaiting_payment: '#f59e0b', payment_received: '#a3e635',
  awaiting_crypto: '#22d3ee', completed: '#34d399',
  rejected: '#f87171', cancelled: '#475569', on_hold: '#fb923c',
};

const card = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 20,
} as const;

export default async function DashboardPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const session = await getSession();
  if (!session) return null;

  const [recentOrders, kycProfile] = await Promise.all([
    prisma.order.findMany({
      where: { userId: session.sub },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.kycProfile.findUnique({ where: { userId: session.sub } }),
  ]);

  const isRtl = locale === 'he';
  const statLabels = STATUS_LABELS[locale] ?? STATUS_LABELS.he;
  const kycPending = !kycProfile || kycProfile.status === 'not_submitted';
  const kycApproved = kycProfile?.status === 'approved';
  const username = session.email.split('@')[0];

  const activeOrders = recentOrders.filter(
    o => !['completed', 'cancelled', 'rejected', 'expired'].includes(o.status)
  ).length;

  return (
    <div
      className="dash-page-wrap"
      style={{
        fontFamily: "'Inter', -apple-system, sans-serif",
        direction: isRtl ? 'rtl' : 'ltr',
      }}
    >

      {/* Header */}
      <div
        className="dash-header-row"
        style={{ flexDirection: isRtl ? 'row-reverse' : 'row' }}
      >
        <div>
          <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
            {locale === 'he' ? `שלום, ${username} 👋` : `Привет, ${username} 👋`}
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>
            {locale === 'he' ? 'ניהול הזמנות ומעקב עסקאות' : 'Управление заявками и отслеживание сделок'}
          </p>
        </div>
        <Link
          href={`/${locale}/orders/new`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '9px 16px', borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            color: 'white', fontSize: 13, fontWeight: 700, textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(59,130,246,0.3)',
          }}
        >
          {locale === 'he' ? '+ הזמנה חדשה' : '+ Новая заявка'}
        </Link>
      </div>

      {/* KYC banner */}
      {kycPending && (
        <div
          className="dash-kyc-banner"
          style={{ flexDirection: isRtl ? 'row-reverse' : 'row' }}
        >
          <span style={{ fontSize: 26, flexShrink: 0 }}>🪪</span>
          <div style={{ flex: 1, minWidth: 0, textAlign: isRtl ? 'right' : 'left' }}>
            <p style={{ color: '#fbbf24', fontWeight: 700, fontSize: 14, margin: 0 }}>
              {locale === 'he' ? 'נדרש אימות זהות (KYC)' : 'Требуется верификация (KYC)'}
            </p>
            <p style={{ color: '#94a3b8', fontSize: 12, margin: '2px 0 0' }}>
              {locale === 'he' ? 'בצע אימות כדי להתחיל לסחור' : 'Пройдите верификацию для торговли'}
            </p>
          </div>
          <Link
            href={`/${locale}/kyc`}
            style={{
              padding: '7px 14px', borderRadius: 10, flexShrink: 0,
              border: '1px solid rgba(245,158,11,0.4)',
              color: '#fbbf24', fontSize: 13, fontWeight: 600, textDecoration: 'none',
              background: 'rgba(245,158,11,0.08)',
              whiteSpace: 'nowrap',
            }}
          >
            {locale === 'he' ? 'אמת עכשיו' : 'Верифицировать'}
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="dash-stats-grid">
        {[
          { label: locale === 'he' ? 'הזמנות' : 'Заявок', value: recentOrders.length, icon: '📋', color: '#60a5fa' },
          { label: locale === 'he' ? 'פעילות' : 'Активных', value: activeOrders, icon: '⚡', color: '#34d399' },
          {
            label: 'KYC',
            value: kycApproved ? '✓' : (locale === 'he' ? 'נדרש' : 'Нужен'),
            icon: '🪪', color: kycApproved ? '#34d399' : '#fbbf24',
          },
        ].map(stat => (
          <div key={stat.label} className="dash-stat-card">
            <div
              className="dash-stat-inner"
              style={{ flexDirection: isRtl ? 'row-reverse' : 'row' }}
            >
              <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>{stat.icon}</span>
              <div className="dash-stat-text" style={{ textAlign: isRtl ? 'right' : 'left' }}>
                <p className="dash-stat-label">{stat.label}</p>
                <p className="dash-stat-value" style={{ color: stat.color }}>{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div style={card}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexDirection: isRtl ? 'row-reverse' : 'row',
          padding: '18px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <h2 style={{ color: 'white', fontSize: 16, fontWeight: 700, margin: 0 }}>
            {locale === 'he' ? 'הזמנות אחרונות' : 'Последние заявки'}
          </h2>
          <Link href={`/${locale}/orders`} style={{ color: '#60a5fa', fontSize: 13, fontWeight: 600 }}>
            {locale === 'he' ? 'כל ההזמנות ←' : '→ Все заявки'}
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>📭</p>
            <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>
              {locale === 'he' ? 'אין הזמנות עדיין' : 'Заявок пока нет'}
            </p>
            <Link href={`/${locale}/orders/new`} style={{ display: 'inline-block', marginTop: 16, color: '#60a5fa', fontSize: 14, fontWeight: 600 }}>
              {locale === 'he' ? 'צור הזמנה ראשונה →' : '→ Создать первую заявку'}
            </Link>
          </div>
        ) : (
          <div>
            {recentOrders.map((order, idx) => (
              <Link
                key={order.id}
                href={`/${locale}/orders/${order.id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  flexDirection: isRtl ? 'row-reverse' : 'row',
                  padding: '14px 20px',
                  borderBottom: idx < recentOrders.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  textDecoration: 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: order.type === 'buy' ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                  color: order.type === 'buy' ? '#34d399' : '#f87171',
                  fontSize: 18, fontWeight: 800,
                }}>
                  {order.type === 'buy' ? '↓' : '↑'}
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: isRtl ? 'right' : 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                    <span style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{order.asset}</span>
                    <span style={{ color: '#64748b', fontSize: 12 }}>
                      {order.type === 'buy' ? (locale === 'he' ? 'קנייה' : 'Покупка') : (locale === 'he' ? 'מכירה' : 'Продажа')}
                    </span>
                  </div>
                  <p style={{ color: '#475569', fontSize: 12, margin: '3px 0 0' }}>
                    {new Date(order.createdAt).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU')}
                  </p>
                </div>
                <div style={{ textAlign: isRtl ? 'left' : 'right', flexShrink: 0 }}>
                  <p style={{ color: 'white', fontWeight: 600, fontSize: 14, margin: 0 }}>
                    {Number(order.fiatAmount).toLocaleString()} {order.fiatCurrency}
                  </p>
                  <p style={{ color: STATUS_COLORS[order.status] ?? '#64748b', fontSize: 12, margin: '3px 0 0', fontWeight: 500 }}>
                    {statLabels[order.status] ?? order.status}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
