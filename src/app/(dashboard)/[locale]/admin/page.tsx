import { getSession, isComplianceOrAdmin, isFinanceOrAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { KycStatus, OrderStatus } from '@prisma/client';

const STATUS_COLORS: Record<string, string> = {
  submitted: '#60a5fa', pending_review: '#fbbf24', awaiting_payment: '#f59e0b',
  payment_received: '#a3e635', awaiting_crypto: '#22d3ee',
  payout_in_progress: '#a78bfa', completed: '#34d399',
  rejected: '#f87171', cancelled: '#475569', on_hold: '#fb923c',
};

const STATUS_BG: Record<string, string> = {
  submitted: 'rgba(96,165,250,0.12)', pending_review: 'rgba(251,191,36,0.12)',
  awaiting_payment: 'rgba(245,158,11,0.12)', payment_received: 'rgba(163,230,53,0.12)',
  awaiting_crypto: 'rgba(34,211,238,0.12)', payout_in_progress: 'rgba(167,139,250,0.12)',
  completed: 'rgba(52,211,153,0.12)', rejected: 'rgba(248,113,113,0.12)',
  cancelled: 'rgba(71,85,105,0.12)', on_hold: 'rgba(251,146,60,0.12)',
};

const STATUS_HE: Record<string, string> = {
  submitted: 'הוגש', pending_review: 'בבדיקה', awaiting_payment: 'ממתין תשלום',
  payment_received: 'תשלום התקבל', awaiting_crypto: 'ממתין קריפטו',
  payout_in_progress: 'תשלום בתהליך', completed: 'הושלם',
  rejected: 'נדחה', cancelled: 'בוטל', on_hold: 'מעוכב',
};

const card = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 20,
} as const;

export default async function AdminDashboardPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isComplianceOrAdmin(session) && !isFinanceOrAdmin(session)) redirect(`/${locale}/dashboard`);

  const [
    pendingReview,
    awaitingPayment,
    totalUsersCount,
    kycPending,
    completedToday,
    totalVolume,
    recentOrders,
  ] = await Promise.all([
    prisma.order.count({ where: { status: OrderStatus.pending_review } }),
    prisma.order.count({ where: { status: OrderStatus.awaiting_payment } }),
    prisma.user.count(),
    prisma.kycProfile.count({ where: { status: KycStatus.pending_review } }),
    prisma.order.count({
      where: {
        status: OrderStatus.completed,
        updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.order.aggregate({
      where: { status: OrderStatus.completed },
      _sum: { fiatAmount: true },
    }),
    prisma.order.findMany({
      take: 15,
      orderBy: { createdAt: 'desc' },
      where: { status: { not: OrderStatus.draft } },
      include: { user: { select: { fullName: true, email: true } } },
    }),
  ]);

  const vol = Number(totalVolume._sum.fiatAmount ?? 0);

  return (
    <div style={{
      padding: '28px 24px', maxWidth: 1000, margin: '0 auto',
      fontFamily: "'Inter', -apple-system, sans-serif",
      direction: 'rtl',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row-reverse', marginBottom: 24 }}>
        <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: 0 }}>🛡️ ניהול מערכת</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href={`/${locale}/admin/users`} style={{
            padding: '8px 16px', borderRadius: 10,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            color: 'white', fontSize: 13, fontWeight: 700,
          }}>👥 משתמשים</Link>
          <Link href={`/${locale}/admin/orders`} style={{
            padding: '8px 16px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#94a3b8', fontSize: 13, fontWeight: 600,
          }}>📋 הזמנות</Link>
          <Link href={`/${locale}/admin/kyc`} style={{
            padding: '8px 16px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#94a3b8', fontSize: 13, fontWeight: 600,
          }}>🪪 KYC</Link>
          <Link href={`/${locale}/admin/rates`} style={{
            padding: '8px 16px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#94a3b8', fontSize: 13, fontWeight: 600,
          }}>💱 שערים</Link>
        </div>
      </div>

      {/* Alert banners */}
      {(pendingReview > 0 || kycPending > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 20 }}>
          {pendingReview > 0 && (
            <Link href={`/${locale}/admin/orders?status=pending_review`} style={{
              display: 'flex', alignItems: 'center', gap: 14, flexDirection: 'row-reverse',
              padding: '14px 18px', borderRadius: 16,
              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)',
              textDecoration: 'none',
            }}>
              <span style={{ fontSize: 26 }}>⚠️</span>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#fbbf24', fontWeight: 700, fontSize: 14, margin: 0 }}>{pendingReview} הזמנות ממתינות לבדיקה</p>
                <p style={{ color: '#94a3b8', fontSize: 12, margin: '2px 0 0' }}>לחץ לצפייה</p>
              </div>
            </Link>
          )}
          {kycPending > 0 && (
            <Link href={`/${locale}/admin/users?kycStatus=pending_review`} style={{
              display: 'flex', alignItems: 'center', gap: 14, flexDirection: 'row-reverse',
              padding: '14px 18px', borderRadius: 16,
              background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.3)',
              textDecoration: 'none',
            }}>
              <span style={{ fontSize: 26 }}>🪪</span>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#60a5fa', fontWeight: 700, fontSize: 14, margin: 0 }}>{kycPending} KYC ממתינים לאישור</p>
                <p style={{ color: '#94a3b8', fontSize: 12, margin: '2px 0 0' }}>לחץ לצפייה</p>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'נפח כולל', value: `₪${(vol / 1000).toFixed(0)}K`, icon: '💰', color: '#34d399' },
          { label: 'הושלמו היום', value: completedToday.toString(), icon: '✅', color: '#34d399' },
          { label: 'ממתין תשלום', value: awaitingPayment.toString(), icon: '💳', color: '#fbbf24' },
          { label: 'סה"כ משתמשים', value: totalUsersCount.toString(), icon: '👥', color: '#60a5fa' },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: '18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexDirection: 'row-reverse' }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>{s.label}</p>
                <p style={{ color: s.color, fontSize: 22, fontWeight: 800, margin: '4px 0 0' }}>{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent orders table */}
      <div style={card}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row-reverse',
          padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <h2 style={{ color: 'white', fontSize: 16, fontWeight: 700, margin: 0 }}>הזמנות אחרונות</h2>
          <Link href={`/${locale}/admin/orders`} style={{ color: '#60a5fa', fontSize: 13, fontWeight: 600 }}>כל ההזמנות ←</Link>
        </div>

        <div>
          {recentOrders.map((order, idx) => (
            <Link
              key={order.id}
              href={`/${locale}/admin/orders/${order.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, flexDirection: 'row-reverse',
                padding: '12px 20px',
                borderBottom: idx < recentOrders.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                textDecoration: 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: order.type === 'buy' ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                color: order.type === 'buy' ? '#34d399' : '#f87171',
                fontSize: 16, fontWeight: 800,
              }}>
                {order.type === 'buy' ? '↓' : '↑'}
              </div>

              <div style={{ flex: 1, textAlign: 'right', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: 'row-reverse' }}>
                  <span style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{order.asset}</span>
                  <span style={{ color: '#64748b', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {order.user.fullName ?? order.user.email}
                  </span>
                </div>
                <p style={{ color: '#475569', fontSize: 12, margin: '3px 0 0' }}>
                  {new Date(order.createdAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div style={{ textAlign: 'left', flexShrink: 0 }}>
                <p style={{ color: 'white', fontWeight: 600, fontSize: 14, margin: 0 }}>
                  ₪{Number(order.fiatAmount).toLocaleString('he-IL')}
                </p>
                <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '2px 8px', borderRadius: 99,
                  background: STATUS_BG[order.status] ?? 'rgba(100,116,139,0.12)',
                  color: STATUS_COLORS[order.status] ?? '#64748b',
                  fontSize: 11, fontWeight: 600, marginTop: 3,
                }}>
                  {STATUS_HE[order.status] ?? order.status}
                </span>
              </div>
            </Link>
          ))}

          {recentOrders.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: 14 }}>אין הזמנות</div>
          )}
        </div>
      </div>
    </div>
  );
}
