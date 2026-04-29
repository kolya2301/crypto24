import { getSession, isComplianceOrAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { KycStatus } from '@prisma/client';

const STATUS_COLORS: Record<string, string> = {
  not_submitted: '#64748b', pending_review: '#fbbf24',
  approved: '#34d399', rejected: '#f87171',
  expired: '#fb923c', more_info_required: '#f59e0b',
};
const STATUS_BG: Record<string, string> = {
  not_submitted: 'rgba(100,116,139,0.12)', pending_review: 'rgba(251,191,36,0.12)',
  approved: 'rgba(52,211,153,0.12)', rejected: 'rgba(248,113,113,0.12)',
  expired: 'rgba(251,146,60,0.12)', more_info_required: 'rgba(245,158,11,0.12)',
};

const STATUS_HE: Record<string, string> = {
  not_submitted: 'לא הוגש', pending_review: 'בבדיקה',
  approved: 'אושר', rejected: 'נדחה', expired: 'פג תוקף', more_info_required: 'נדרש מידע נוסף',
};
const STATUS_RU: Record<string, string> = {
  not_submitted: 'Не отправлено', pending_review: 'На проверке',
  approved: 'Одобрено', rejected: 'Отклонено', expired: 'Истекло', more_info_required: 'Требуется информация',
};

const card = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 20,
} as const;

export default async function KYCReviewQueuePage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isComplianceOrAdmin(session)) redirect(`/${locale}/dashboard`);

  const profiles = await prisma.kycProfile.findMany({
    where: { status: KycStatus.pending_review },
    include: {
      user: { select: { id: true, fullName: true, email: true, createdAt: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });

  const isRtl = locale === 'he';
  const statusMap = isRtl ? STATUS_HE : STATUS_RU;

  return (
    <div
      className="admin-page-wrap"
      style={{ fontFamily: "'Inter', -apple-system, sans-serif", direction: isRtl ? 'rtl' : 'ltr' }}
    >

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: isRtl ? 'row-reverse' : 'row', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: 0 }}>
          🪪 {isRtl ? 'תור אישור KYC' : 'KYC Review Queue'}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            padding: '5px 12px', borderRadius: 99,
            background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)',
            color: '#fbbf24', fontSize: 13, fontWeight: 600,
          }}>
            {profiles.length} {isRtl ? 'בבדיקה' : 'pending'}
          </span>
          <Link href={`/${locale}/admin`} style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>
            {isRtl ? '→ חזרה' : '← Back'}
          </Link>
        </div>
      </div>

      {profiles.length === 0 ? (
        <div style={{ ...card, padding: '64px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>✅</p>
          <p style={{ color: '#64748b', fontSize: 15 }}>
            {isRtl ? 'אין פרופילים בבדיקה' : 'No profiles pending review'}
          </p>
        </div>
      ) : (
        <div style={card}>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {/* Table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 80px',
              padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
              gap: 12, minWidth: 520,
            }}>
              {[
                isRtl ? 'שם' : 'Name',
                isRtl ? 'אימייל' : 'Email',
                isRtl ? 'סטטוס' : 'Status',
                isRtl ? 'תאריך הגשה' : 'Submitted',
                isRtl ? 'פעולה' : 'Action',
              ].map(h => (
                <span key={h} style={{ color: '#64748b', fontSize: 12, fontWeight: 600, textAlign: isRtl ? 'right' : 'left' }}>{h}</span>
              ))}
            </div>

            {profiles.map((profile, idx) => (
              <div
                key={profile.id}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 80px',
                  padding: '14px 20px', gap: 12, alignItems: 'center',
                  minWidth: 520,
                  borderBottom: idx < profiles.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}
              >
                <span style={{ color: 'white', fontWeight: 600, fontSize: 14, textAlign: isRtl ? 'right' : 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile.user.fullName || profile.user.email}
                </span>
                <span style={{ color: '#94a3b8', fontSize: 13, textAlign: isRtl ? 'right' : 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile.user.email}
                </span>
                <div style={{ textAlign: isRtl ? 'right' : 'left' }}>
                  <span style={{
                    display: 'inline-flex', padding: '3px 10px', borderRadius: 99,
                    background: STATUS_BG[profile.status] ?? 'rgba(100,116,139,0.12)',
                    color: STATUS_COLORS[profile.status] ?? '#64748b',
                    fontSize: 11, fontWeight: 600,
                  }}>
                    {statusMap[profile.status] ?? profile.status}
                  </span>
                </div>
                <span style={{ color: '#64748b', fontSize: 12, textAlign: isRtl ? 'right' : 'left' }}>
                  {profile.submittedAt ? new Date(profile.submittedAt).toLocaleDateString(isRtl ? 'he-IL' : 'ru-RU') : '—'}
                </span>
                <div style={{ textAlign: isRtl ? 'right' : 'left' }}>
                  <Link
                    href={`/${locale}/admin/users/${profile.userId}`}
                    style={{
                      padding: '6px 12px', borderRadius: 8,
                      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      color: 'white', fontSize: 12, fontWeight: 700,
                    }}
                  >
                    {isRtl ? 'בדוק' : 'Review'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
