import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

const TYPE_ICONS: Record<string, string> = {
  order_status_change: '📋', kyc_status_change: '🪪',
  document_requested: '📎', payment_received: '💰',
  payout_sent: '✅', security_alert: '🔐', system_message: '📢',
};

const card = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 20,
} as const;

export default async function NotificationsPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const notifications = await prisma.notification.findMany({
    where: { userId: session.sub },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const isRtl = locale === 'he';

  const TYPE_LABELS: Record<string, string> = locale === 'he' ? {
    order_status_change: 'שינוי סטטוס הזמנה', kyc_status_change: 'שינוי סטטוס KYC',
    document_requested: 'נדרשות מסמכים', payment_received: 'תשלום התקבל',
    payout_sent: 'תשלום נשלח', security_alert: 'התראת אבטחה', system_message: 'הודעת מערכת',
  } : {
    order_status_change: 'Статус заявки изменён', kyc_status_change: 'Статус KYC изменён',
    document_requested: 'Запрос документов', payment_received: 'Оплата получена',
    payout_sent: 'Выплата отправлена', security_alert: 'Предупреждение безопасности', system_message: 'Системное сообщение',
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div style={{
      padding: '28px 24px', maxWidth: 720, margin: '0 auto',
      fontFamily: "'Inter', -apple-system, sans-serif",
      direction: isRtl ? 'rtl' : 'ltr',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: isRtl ? 'row-reverse' : 'row', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: 0 }}>
            🔔 {locale === 'he' ? 'התראות' : 'Уведомления'}
          </h1>
          {unreadCount > 0 && (
            <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>
              {unreadCount} {locale === 'he' ? 'לא נקראו' : 'непрочитанных'}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <span style={{
            padding: '5px 12px', borderRadius: 99,
            background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)',
            color: '#60a5fa', fontSize: 12, fontWeight: 700,
          }}>
            {unreadCount} {locale === 'he' ? 'חדשות' : 'новых'}
          </span>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{ ...card, padding: '64px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🔕</p>
          <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>
            {locale === 'he' ? 'אין התראות' : 'Уведомлений нет'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notifications.map(notif => (
            <div
              key={notif.id}
              style={{
                background: notif.isRead ? 'rgba(255,255,255,0.04)' : 'rgba(59,130,246,0.06)',
                border: `1px solid ${notif.isRead ? 'rgba(255,255,255,0.08)' : 'rgba(59,130,246,0.25)'}`,
                borderRadius: 16, padding: '16px 20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexDirection: isRtl ? 'row-reverse' : 'row' }}>
                {/* Unread indicator + icon */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {!notif.isRead && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
                  )}
                  <span style={{ fontSize: 20 }}>{TYPE_ICONS[notif.type] ?? '📢'}</span>
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0, textAlign: isRtl ? 'right' : 'left' }}>
                  <h3 style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: 0 }}>
                    {locale === 'he' ? notif.titleHe : notif.titleRu}
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: 13, margin: '6px 0 0', lineHeight: 1.5 }}>
                    {locale === 'he' ? notif.bodyHe : notif.bodyRu}
                  </p>
                  <p style={{ color: '#475569', fontSize: 11, margin: '8px 0 0' }}>
                    {TYPE_LABELS[notif.type] ?? notif.type}
                    {' · '}
                    {new Date(notif.createdAt).toLocaleDateString(isRtl ? 'he-IL' : 'ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
