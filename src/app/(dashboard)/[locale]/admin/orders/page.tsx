import { getSession, isComplianceOrAdmin, isFinanceOrAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';

const STATUS_COLORS: Record<string, string> = {
  submitted: '#60a5fa', pending_review: '#fbbf24', awaiting_payment: '#f59e0b',
  payment_received: '#a3e635', awaiting_crypto: '#22d3ee',
  payout_in_progress: '#a78bfa', completed: '#34d399',
  rejected: '#f87171', cancelled: '#475569', on_hold: '#fb923c',
  expired: '#64748b', pending_kyc: '#fbbf24',
};
const STATUS_BG: Record<string, string> = {
  submitted: 'rgba(96,165,250,0.12)', pending_review: 'rgba(251,191,36,0.12)',
  awaiting_payment: 'rgba(245,158,11,0.12)', payment_received: 'rgba(163,230,53,0.12)',
  awaiting_crypto: 'rgba(34,211,238,0.12)', payout_in_progress: 'rgba(167,139,250,0.12)',
  completed: 'rgba(52,211,153,0.12)', rejected: 'rgba(248,113,113,0.12)',
  cancelled: 'rgba(71,85,105,0.12)', on_hold: 'rgba(251,146,60,0.12)',
  expired: 'rgba(100,116,139,0.12)', pending_kyc: 'rgba(251,191,36,0.12)',
};
const STATUS_HE: Record<string, string> = {
  submitted: 'הוגש', pending_review: 'בבדיקה', awaiting_payment: 'ממתין תשלום',
  payment_received: 'תשלום התקבל', awaiting_crypto: 'ממתין קריפטו',
  payout_in_progress: 'תשלום בתהליך', completed: 'הושלם',
  rejected: 'נדחה', cancelled: 'בוטל', on_hold: 'מעוכב', expired: 'פג תוקף', pending_kyc: 'ממתין KYC',
};

const card = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 20,
} as const;

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { status?: string; page?: string };
}) {
  const { locale } = params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isComplianceOrAdmin(session) && !isFinanceOrAdmin(session)) redirect(`/${locale}/dashboard`);

  const page = parseInt(searchParams.page ?? '1', 10);
  const limit = 25;
  const statusFilter = searchParams.status as OrderStatus | undefined;

  const where = {
    ...(statusFilter ? { status: statusFilter } : { status: { not: OrderStatus.draft } }),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { fullName: true, email: true, phone: true } } },
    }),
    prisma.order.count({ where }),
  ]);

  const pages = Math.ceil(total / limit);

  const filters = [
    { key: '', label: 'כולם' },
    { key: 'pending_review', label: '⚠️ בבדיקה' },
    { key: 'awaiting_payment', label: '💳 ממתין תשלום' },
    { key: 'payment_received', label: '✅ תשלום התקבל' },
    { key: 'awaiting_crypto', label: '🔄 ממתין קריפטו' },
    { key: 'completed', label: '✅ הושלם' },
    { key: 'on_hold', label: '⏸️ מעוכב' },
  ];

  return (
    <div style={{
      padding: '28px 24px', maxWidth: 1100, margin: '0 auto',
      fontFamily: "'Inter', -apple-system, sans-serif",
      direction: 'rtl',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row-reverse', marginBottom: 20 }}>
        <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: 0 }}>📋 ניהול הזמנות</h1>
        <Link href={`/${locale}/admin`} style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>→ חזרה</Link>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {filters.map(f => {
          const isActive = (searchParams.status ?? '') === f.key;
          return (
            <Link
              key={f.key}
              href={`/${locale}/admin/orders${f.key ? `?status=${f.key}` : ''}`}
              style={{
                padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                background: isActive ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.05)',
                border: isActive ? 'none' : '1px solid rgba(255,255,255,0.1)',
                color: isActive ? 'white' : '#94a3b8',
                textDecoration: 'none',
              }}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16, textAlign: 'right' }}>{total} הזמנות</p>

      <div style={card}>
        {orders.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b', fontSize: 14 }}>אין הזמנות</div>
        )}
        {orders.map((order, idx) => (
          <Link
            key={order.id}
            href={`/${locale}/admin/orders/${order.id}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, flexDirection: 'row-reverse',
              padding: '13px 20px',
              borderBottom: idx < orders.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              textDecoration: 'none', transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {/* Type */}
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: order.type === 'buy' ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
              color: order.type === 'buy' ? '#34d399' : '#f87171',
              fontSize: 16, fontWeight: 900,
            }}>
              {order.type === 'buy' ? '↓' : '↑'}
            </div>

            {/* Asset + client */}
            <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: 'row-reverse' }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{order.asset}</span>
                <span style={{ color: '#64748b', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                  {order.user.fullName ?? order.user.email}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexDirection: 'row-reverse', marginTop: 3 }}>
                <span style={{ color: '#475569', fontSize: 11 }}>
                  {new Date(order.createdAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
                {order.user.phone && (
                  <span style={{ color: '#334155', fontSize: 11 }}>{order.user.phone}</span>
                )}
              </div>
            </div>

            {/* Amount + status */}
            <div style={{ textAlign: 'left', flexShrink: 0 }}>
              <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: 0 }}>
                ₪{Number(order.fiatAmount).toLocaleString('he-IL')}
              </p>
              <span style={{
                display: 'inline-flex', marginTop: 3, padding: '2px 8px', borderRadius: 99,
                background: STATUS_BG[order.status] ?? 'rgba(100,116,139,0.12)',
                color: STATUS_COLORS[order.status] ?? '#64748b',
                fontSize: 11, fontWeight: 600,
              }}>
                {STATUS_HE[order.status] ?? order.status}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          {Array.from({ length: Math.min(pages, 10) }, (_, i) => i + 1).map(p => (
            <Link
              key={p}
              href={`/${locale}/admin/orders?page=${p}${statusFilter ? `&status=${statusFilter}` : ''}`}
              style={{
                width: 36, height: 36, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 600,
                background: p === page ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.05)',
                border: p === page ? 'none' : '1px solid rgba(255,255,255,0.1)',
                color: p === page ? 'white' : '#94a3b8',
                textDecoration: 'none',
              }}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
