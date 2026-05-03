import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { HoverLink } from '@/components/ui/HoverLink';

const STATUS_COLORS: Record<string, string> = {
  draft: '#64748b', submitted: '#60a5fa', pending_review: '#fbbf24', pending_kyc: '#fbbf24',
  awaiting_payment: '#f59e0b', payment_received: '#a3e635', awaiting_crypto: '#22d3ee',
  payout_in_progress: '#a78bfa', completed: '#34d399',
  rejected: '#f87171', cancelled: '#475569', on_hold: '#fb923c', expired: '#64748b',
};
const STATUS_BG: Record<string, string> = {
  draft: 'rgba(100,116,139,0.1)', submitted: 'rgba(96,165,250,0.1)', pending_review: 'rgba(251,191,36,0.1)',
  pending_kyc: 'rgba(251,191,36,0.1)', awaiting_payment: 'rgba(245,158,11,0.1)',
  payment_received: 'rgba(163,230,53,0.1)', awaiting_crypto: 'rgba(34,211,238,0.1)',
  payout_in_progress: 'rgba(167,139,250,0.1)', completed: 'rgba(52,211,153,0.1)',
  rejected: 'rgba(248,113,113,0.1)', cancelled: 'rgba(71,85,105,0.1)',
  on_hold: 'rgba(251,146,60,0.1)', expired: 'rgba(100,116,139,0.1)',
};

const STATUS_LABELS: Record<string, Record<string, string>> = {
  he: {
    draft: 'טיוטה', submitted: 'הוגש', pending_review: 'בבדיקה', pending_kyc: 'ממתין KYC',
    awaiting_payment: 'ממתין לתשלום', payment_received: 'תשלום התקבל', awaiting_crypto: 'ממתין לקריפטו',
    crypto_received: 'קריפטו התקבל', payout_in_progress: 'תשלום בתהליך',
    completed: 'הושלם', rejected: 'נדחה', cancelled: 'בוטל', on_hold: 'מעוכב', expired: 'פג תוקף',
  },
  ru: {
    draft: 'Черновик', submitted: 'Отправлено', pending_review: 'На проверке', pending_kyc: 'Ожидает KYC',
    awaiting_payment: 'Ожидает оплаты', payment_received: 'Оплата получена', awaiting_crypto: 'Ожидает крипто',
    crypto_received: 'Крипто получено', payout_in_progress: 'Выплата',
    completed: 'Завершено', rejected: 'Отклонено', cancelled: 'Отменено', on_hold: 'На удержании', expired: 'Истёк',
  },
};

const card = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 20,
} as const;

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { page?: string };
}) {
  const { locale } = params;
  const session = await getSession();
  if (!session) return null;

  const page = parseInt(searchParams.page ?? '1', 10);
  const limit = 20;
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId: session.sub },
      orderBy: { createdAt: 'desc' },
      skip, take: limit,
    }),
    prisma.order.count({ where: { userId: session.sub } }),
  ]);

  const pages = Math.ceil(total / limit);
  const isRtl = locale === 'he';
  const statLabels = STATUS_LABELS[locale] ?? STATUS_LABELS.he;

  return (
    <div style={{
      padding: '28px 24px', maxWidth: 900, margin: '0 auto',
      fontFamily: "'Inter', -apple-system, sans-serif",
      direction: isRtl ? 'rtl' : 'ltr',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: isRtl ? 'row-reverse' : 'row', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: 0 }}>
            {locale === 'he' ? '📋 הזמנות שלי' : '📋 Мои заявки'}
          </h1>
          {total > 0 && (
            <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>
              {total} {locale === 'he' ? 'הזמנות' : 'заявок'}
            </p>
          )}
        </div>
        <Link
          href={`/${locale}/orders/new`}
          style={{
            padding: '10px 20px', borderRadius: 12,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            color: 'white', fontSize: 14, fontWeight: 700,
            boxShadow: '0 4px 20px rgba(59,130,246,0.3)',
          }}
        >
          {locale === 'he' ? '+ חדש' : '+ Новая'}
        </Link>
      </div>

      {orders.length === 0 ? (
        <div style={{ ...card, padding: '64px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>📭</p>
          <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>
            {locale === 'he' ? 'אין הזמנות עדיין' : 'Заявок пока нет'}
          </p>
          <Link href={`/${locale}/orders/new`} style={{ display: 'inline-block', marginTop: 16, color: '#60a5fa', fontSize: 14, fontWeight: 600 }}>
            {locale === 'he' ? 'צור הזמנה ראשונה →' : '→ Создать первую заявку'}
          </Link>
        </div>
      ) : (
        <>
          <div style={card}>
            {orders.map((order, idx) => (
              <HoverLink
                key={order.id}
                href={`/${locale}/orders/${order.id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  flexDirection: isRtl ? 'row-reverse' : 'row',
                  padding: '14px 20px',
                  borderBottom: idx < orders.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  textDecoration: 'none', transition: 'background 0.15s',
                }}
              >
                {/* Type icon */}
                <div style={{
                  width: 42, height: 42, borderRadius: 13, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: order.type === 'buy' ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                  color: order.type === 'buy' ? '#34d399' : '#f87171',
                  fontSize: 18, fontWeight: 900,
                }}>
                  {order.type === 'buy' ? '↓' : '↑'}
                </div>

                {/* Asset + date */}
                <div style={{ flex: 1, minWidth: 0, textAlign: isRtl ? 'right' : 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                    <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{order.asset}</span>
                    <span style={{ color: order.type === 'buy' ? '#34d399' : '#f87171', fontSize: 12, fontWeight: 600 }}>
                      {order.type === 'buy' ? (locale === 'he' ? 'קנייה' : 'Покупка') : (locale === 'he' ? 'מכירה' : 'Продажа')}
                    </span>
                  </div>
                  <p style={{ color: '#475569', fontSize: 12, margin: '4px 0 0' }}>
                    {new Date(order.createdAt).toLocaleDateString(locale === 'he' ? 'he-IL' : 'ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                {/* Amount + status */}
                <div style={{ textAlign: isRtl ? 'left' : 'right', flexShrink: 0 }}>
                  <p style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: 0 }}>
                    {Number(order.fiatAmount).toLocaleString()} {order.fiatCurrency}
                  </p>
                  <span style={{
                    display: 'inline-flex', marginTop: 4, padding: '2px 10px', borderRadius: 99,
                    background: STATUS_BG[order.status] ?? 'rgba(100,116,139,0.1)',
                    color: STATUS_COLORS[order.status] ?? '#64748b',
                    fontSize: 11, fontWeight: 600,
                  }}>
                    {statLabels[order.status] ?? order.status}
                  </span>
                </div>
              </HoverLink>
            ))}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                <Link
                  key={p}
                  href={`/${locale}/orders?page=${p}`}
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
        </>
      )}
    </div>
  );
}
