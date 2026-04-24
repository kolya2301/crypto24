import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { KycForm } from './KycForm';

const DOC_STATUS: Record<string, { color: string; bg: string }> = {
  approved: { color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  rejected: { color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  pending: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
};

const card = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 20, padding: '24px',
} as const;

export default async function KycPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const session = await getSession();
  if (!session) return null;

  const [kycProfile, kycDocuments] = await Promise.all([
    prisma.kycProfile.findUnique({ where: { userId: session.sub } }),
    prisma.kycDocument.findMany({
      where: { userId: session.sub },
      orderBy: { uploadedAt: 'desc' },
      take: 10,
    }),
  ]);

  const isRtl = locale === 'he';

  const statusConfig: Record<string, {
    icon: string; color: string; border: string; bg: string;
    label: Record<string, string>; message: Record<string, string>;
  }> = {
    not_submitted: {
      icon: '🪪', color: '#94a3b8', border: 'rgba(148,163,184,0.2)', bg: 'rgba(148,163,184,0.05)',
      label: { he: 'לא הוגש', ru: 'Не подано' },
      message: { he: 'השלם את אימות הזהות כדי להתחיל לסחור.', ru: 'Пройдите верификацию личности для начала торговли.' },
    },
    pending_review: {
      icon: '⏳', color: '#fbbf24', border: 'rgba(251,191,36,0.25)', bg: 'rgba(251,191,36,0.06)',
      label: { he: 'בבדיקה', ru: 'На проверке' },
      message: { he: 'המסמכים שלך בבדיקה. נחזור אליך תוך 1-3 ימי עסקים.', ru: 'Документы на проверке. Ответим в течение 1-3 рабочих дней.' },
    },
    approved: {
      icon: '✅', color: '#34d399', border: 'rgba(52,211,153,0.25)', bg: 'rgba(52,211,153,0.06)',
      label: { he: 'מאושר', ru: 'Одобрено' },
      message: { he: 'הזהות שלך מאומתת! ניתן לבצע עסקאות.', ru: 'Ваша личность верифицирована! Можно совершать сделки.' },
    },
    rejected: {
      icon: '❌', color: '#f87171', border: 'rgba(248,113,113,0.25)', bg: 'rgba(248,113,113,0.06)',
      label: { he: 'נדחה', ru: 'Отклонено' },
      message: { he: 'הבקשה נדחתה. ניתן לפנות לתמיכה.', ru: 'Заявка отклонена. Обратитесь в поддержку.' },
    },
    more_info_required: {
      icon: '📎', color: '#f59e0b', border: 'rgba(245,158,11,0.25)', bg: 'rgba(245,158,11,0.06)',
      label: { he: 'נדרש מידע נוסף', ru: 'Требуется информация' },
      message: { he: 'נדרש מידע נוסף. פנה לתמיכה.', ru: 'Требуется дополнительная информация.' },
    },
    expired: {
      icon: '⚠️', color: '#fb923c', border: 'rgba(251,146,60,0.25)', bg: 'rgba(251,146,60,0.06)',
      label: { he: 'פג תוקף', ru: 'Истёк' },
      message: { he: 'אימות הזהות פג. יש לחדש.', ru: 'Срок верификации истёк. Требуется обновление.' },
    },
  };

  const status = kycProfile?.status ?? 'not_submitted';
  const cfg = statusConfig[status] ?? statusConfig.not_submitted;
  const canSubmit = !kycProfile || ['not_submitted', 'rejected', 'expired', 'more_info_required'].includes(status);

  return (
    <div style={{
      padding: '28px 24px', maxWidth: 640, margin: '0 auto',
      fontFamily: "'Inter', -apple-system, sans-serif",
      direction: isRtl ? 'rtl' : 'ltr',
    }}>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: 0 }}>
          {locale === 'he' ? '🪪 אימות זהות (KYC)' : '🪪 Верификация личности (KYC)'}
        </h1>
        <p style={{ color: '#64748b', fontSize: 13, margin: '6px 0 0' }}>
          {locale === 'he'
            ? 'נדרש על פי חוק הישראלי לצורך ביצוע עסקאות קריפטו'
            : 'Требуется по израильскому законодательству для совершения криптосделок'}
        </p>
      </div>

      {/* Status card */}
      <div style={{
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        borderRadius: 20, padding: '20px 24px', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexDirection: isRtl ? 'row-reverse' : 'row' }}>
          <span style={{ fontSize: 32, flexShrink: 0 }}>{cfg.icon}</span>
          <div style={{ textAlign: isRtl ? 'right' : 'left' }}>
            <p style={{ color: cfg.color, fontWeight: 700, fontSize: 16, margin: 0 }}>
              {cfg.label[locale] ?? cfg.label.he}
            </p>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0' }}>
              {cfg.message[locale] ?? cfg.message.he}
            </p>
          </div>
        </div>

        {kycProfile?.rejectionReason && (
          <div style={{
            marginTop: 14, padding: '12px 16px',
            background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 10, color: '#fca5a5', fontSize: 13,
          }}>
            {kycProfile.rejectionReason}
          </div>
        )}
        {kycProfile?.expiresAt && (
          <p style={{ color: '#64748b', fontSize: 12, margin: '10px 0 0' }}>
            {locale === 'he' ? 'תוקף עד: ' : 'Действителен до: '}
            {new Date(kycProfile.expiresAt).toLocaleDateString(isRtl ? 'he-IL' : 'ru-RU')}
          </p>
        )}
      </div>

      {/* Uploaded documents */}
      {kycDocuments.length > 0 && (
        <div style={{ ...card, marginBottom: 20 }}>
          <h2 style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: '0 0 16px' }}>
            {locale === 'he' ? '📁 מסמכים שהועלו' : '📁 Загруженные документы'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {kycDocuments.map(doc => {
              const ds = DOC_STATUS[doc.status] ?? DOC_STATUS.pending;
              return (
                <div key={doc.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexDirection: isRtl ? 'row-reverse' : 'row',
                  padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                }}>
                  <span style={{ color: '#94a3b8', fontSize: 13 }}>{doc.documentType}</span>
                  <span style={{
                    padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                    background: ds.bg, color: ds.color,
                  }}>{doc.status}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KYC form */}
      {canSubmit && (
        <KycForm
          locale={locale}
          existingProfile={kycProfile ? {
            dateOfBirth: kycProfile.dateOfBirth?.toISOString().split('T')[0] ?? '',
            city: kycProfile.city ?? '',
            country: kycProfile.country ?? '',
            sourceOfFunds: kycProfile.sourceOfFundsStatus ?? '',
          } : undefined}
        />
      )}
    </div>
  );
}
