import { getSession, isComplianceOrAdmin } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { AdminUserActions } from './AdminUserActions';

const card = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 16,
  padding: '20px 22px',
} as const;

const ROLE_COLOR: Record<string, string> = {
  admin: '#f59e0b', compliance_officer: '#8b5cf6', finance_operator: '#3b82f6',
  registered_user: '#64748b', visitor: '#334155',
};
const STATUS_COLOR: Record<string, string> = {
  active: '#34d399', suspended: '#f87171', pending_verification: '#fbbf24', deactivated: '#475569',
};
const KYC_COLOR: Record<string, string> = {
  approved: '#34d399', pending_review: '#60a5fa', rejected: '#f87171',
  not_submitted: '#475569', expired: '#fb923c', more_info_required: '#fbbf24',
};
const ORDER_STATUS_HE: Record<string, string> = {
  completed: 'הושלם', pending_review: 'בבדיקה', awaiting_payment: 'ממתין תשלום',
  rejected: 'נדחה', cancelled: 'בוטל', submitted: 'הוגש', on_hold: 'מעוכב',
  payment_received: 'תשלום התקבל', awaiting_crypto: 'ממתין קריפטו',
  payout_in_progress: 'בתשלום', draft: 'טיוטה',
};
const ORDER_STATUS_COLOR: Record<string, string> = {
  completed: '#34d399', rejected: '#f87171', cancelled: '#475569',
  on_hold: '#fb923c', pending_review: '#fbbf24', awaiting_payment: '#60a5fa',
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  const { locale, id } = params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isComplianceOrAdmin(session)) redirect(`/${locale}/dashboard`);

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      kycProfile: true,
      kycDocuments: { orderBy: { uploadedAt: 'desc' } },
      wallets: { orderBy: { createdAt: 'desc' } },
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { paymentRecords: { select: { method: true, status: true, amount: true } } },
      },
      auditLogsAsSubject: {
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: { id: true, action: true, description: true, actorRole: true, ipAddress: true, createdAt: true },
      },
      crmClient: { include: { deals: { orderBy: { createdAt: 'desc' }, take: 5 } } },
    },
  });

  if (!user) notFound();

  const kyc = user.kycProfile;
  const completedOrders = user.orders.filter(o => o.status === 'completed');
  const totalVolume = completedOrders.reduce((s, o) => s + Number(o.fiatAmount), 0);
  const totalFees = completedOrders.reduce((s, o) => s + Number(o.feeAmount), 0);

  return (
    <div style={{ padding: '24px 20px', maxWidth: 960, margin: '0 auto', fontFamily: "'Inter', sans-serif", direction: 'rtl' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'rgba(59,130,246,0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 800, color: '#60a5fa', flexShrink: 0,
          }}>
            {(user.fullName ?? user.email)[0].toUpperCase()}
          </div>
          <div>
            <h1 style={{ color: 'white', fontSize: 18, fontWeight: 800, margin: 0 }}>{user.fullName}</h1>
            <p style={{ color: '#64748b', fontSize: 13, margin: '3px 0 0' }}>{user.email}</p>
          </div>
        </div>
        <Link href={`/${locale}/admin/users`} style={{ color: '#64748b', fontSize: 13 }}>← חזרה לרשימה</Link>
      </div>

      {/* Financial summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'נפח כולל', value: `₪${totalVolume.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`, color: '#a3e635' },
          { label: 'עסקאות', value: user.orders.length, color: '#60a5fa' },
          { label: 'הושלמו', value: completedOrders.length, color: '#34d399' },
          { label: 'עמלות שולמו', value: `₪${totalFees.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`, color: '#fbbf24' },
          { label: 'ריסק סקור', value: user.riskScore, color: user.riskScore > 70 ? '#f87171' : user.riskScore > 40 ? '#fbbf24' : '#34d399' },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: '14px 16px' }}>
            <p style={{ color: '#64748b', fontSize: 11, margin: 0, marginBottom: 4 }}>{s.label}</p>
            <p style={{ color: s.color, fontSize: 20, fontWeight: 800, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Basic info */}
        <div style={{ ...card }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: '0 0 14px' }}>פרטים אישיים</p>
          {[
            { label: 'שם מלא', value: user.fullName },
            { label: 'אימייל', value: user.email },
            { label: 'טלפון', value: user.phone },
            { label: 'מדינת מגורים', value: user.residencyCountry },
            { label: 'נרשם', value: new Date(user.createdAt).toLocaleDateString('he-IL') },
            { label: 'כניסה אחרונה', value: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('he-IL') : '—' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color: '#64748b', fontSize: 12 }}>{row.label}</span>
              <span style={{ color: 'white', fontSize: 12, fontWeight: 500 }}>{row.value || '—'}</span>
            </div>
          ))}
          {/* Role + Status badges */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <span style={{
              padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              background: `${ROLE_COLOR[user.role]}22`, color: ROLE_COLOR[user.role],
            }}>{user.role.replace(/_/g, ' ')}</span>
            <span style={{
              padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              background: `${STATUS_COLOR[user.status]}22`, color: STATUS_COLOR[user.status],
            }}>{user.status}</span>
          </div>
        </div>

        {/* KYC info */}
        <div style={{ ...card }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: '0 0 14px' }}>KYC / זיהוי</p>
          {kyc ? (
            <>
              {[
                { label: 'סטטוס', value: kyc.status, color: KYC_COLOR[kyc.status] },
                { label: 'רמה', value: kyc.level },
                { label: 'ת"ז / דרכון', value: kyc.idNumber ? '••••' + kyc.idNumber.slice(-4) : '—' },
                { label: 'תאריך לידה', value: kyc.dateOfBirth ? new Date(kyc.dateOfBirth).toLocaleDateString('he-IL') : '—' },
                { label: 'עיר', value: `${kyc.city ?? '—'}${kyc.country ? ` · ${kyc.country}` : ''}` },
                { label: 'מקור הכספים', value: kyc.sourceOfFundsStatus ?? '—' },
                { label: 'הוגש', value: kyc.submittedAt ? new Date(kyc.submittedAt).toLocaleDateString('he-IL') : '—' },
                { label: 'פג תוקף', value: kyc.expiresAt ? new Date(kyc.expiresAt).toLocaleDateString('he-IL') : '—' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: '#64748b', fontSize: 12 }}>{row.label}</span>
                  <span style={{ color: row.color ?? 'white', fontSize: 12, fontWeight: row.color ? 700 : 500 }}>{row.value}</span>
                </div>
              ))}
              {(kyc.sanctionsFlag || kyc.pepFlag) && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(248,113,113,0.08)', borderRadius: 8, border: '1px solid rgba(248,113,113,0.2)' }}>
                  {kyc.sanctionsFlag && <p style={{ color: '#f87171', fontSize: 12, margin: 0, fontWeight: 700 }}>🚨 Sanctions Flag</p>}
                  {kyc.pepFlag && <p style={{ color: '#f87171', fontSize: 12, margin: 0, fontWeight: 700 }}>⚠️ PEP Flag</p>}
                </div>
              )}
              {kyc.rejectionReason && (
                <p style={{ color: '#f87171', fontSize: 11, marginTop: 8 }}>סיבת דחייה: {kyc.rejectionReason}</p>
              )}
            </>
          ) : (
            <p style={{ color: '#475569', fontSize: 13 }}>KYC לא הוגש</p>
          )}
        </div>
      </div>

      {/* Admin Actions */}
      <div style={{ ...card, marginBottom: 16 }}>
        <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: '0 0 14px' }}>⚙️ פעולות ניהול</p>
        <AdminUserActions
          userId={id}
          currentRole={user.role}
          currentStatus={user.status}
          currentRiskScore={user.riskScore}
          kycStatus={kyc?.status ?? 'not_submitted'}
          locale={locale}
        />
      </div>

      {/* KYC Documents */}
      {user.kycDocuments.length > 0 && (
        <div style={{ ...card, marginBottom: 16 }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: '0 0 14px' }}>📄 מסמכי KYC ({user.kycDocuments.length})</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {user.kycDocuments.map(doc => (
              <div key={doc.id} style={{
                padding: '10px 14px', borderRadius: 10, fontSize: 12,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                minWidth: 180,
              }}>
                <p style={{ color: '#60a5fa', fontWeight: 600, margin: 0 }}>{doc.documentType.replace(/_/g, ' ')}</p>
                <p style={{ color: doc.status === 'approved' ? '#34d399' : doc.status === 'rejected' ? '#f87171' : '#fbbf24', fontSize: 11, margin: '4px 0 0', fontWeight: 600 }}>
                  {doc.status}
                </p>
                <p style={{ color: '#475569', fontSize: 10, margin: '4px 0 0' }}>
                  {new Date(doc.uploadedAt).toLocaleDateString('he-IL')}
                </p>
                {doc.fileUrl && (
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                    style={{ color: '#3b82f6', fontSize: 11, display: 'block', marginTop: 6 }}>
                    צפה במסמך ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wallets */}
      {user.wallets.length > 0 && (
        <div style={{ ...card, marginBottom: 16 }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: '0 0 14px' }}>💼 ארנקים ({user.wallets.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {user.wallets.map(w => (
              <div key={w.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                <div>
                  <span style={{ color: '#60a5fa', fontWeight: 700, fontSize: 13 }}>{w.asset}</span>
                  {w.label && <span style={{ color: '#475569', fontSize: 12, marginRight: 8 }}>{w.label}</span>}
                  <p style={{ color: '#64748b', fontSize: 11, margin: '3px 0 0', fontFamily: 'monospace' }}>{w.address}</p>
                </div>
                <span style={{
                  padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                  color: w.verificationStatus === 'verified' ? '#34d399' : w.verificationStatus === 'pending' ? '#fbbf24' : '#f87171',
                  background: w.verificationStatus === 'verified' ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)',
                }}>{w.verificationStatus}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders */}
      <div style={{ ...card, marginBottom: 16 }}>
        <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: '0 0 14px' }}>📋 היסטוריית הזמנות ({user.orders.length})</p>
        {user.orders.length === 0 ? (
          <p style={{ color: '#475569', fontSize: 13 }}>אין הזמנות</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 600 }}>
              <thead>
                <tr>
                  {['תאריך', 'סוג', 'מטבע', 'סכום ₪', 'עמלה ₪', 'שיטת תשלום', 'סטטוס', ''].map(h => (
                    <th key={h} style={{ padding: '7px 10px', color: '#64748b', fontWeight: 600, textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {user.orders.map(order => (
                  <tr key={order.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '8px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(order.createdAt).toLocaleDateString('he-IL')}</td>
                    <td style={{ padding: '8px 10px', color: order.type === 'buy' ? '#34d399' : '#f87171', fontWeight: 700 }}>
                      {order.type === 'buy' ? '↓ קנייה' : '↑ מכירה'}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#60a5fa', fontWeight: 600 }}>{order.asset}</td>
                    <td style={{ padding: '8px 10px', color: 'white', whiteSpace: 'nowrap' }}>₪{Number(order.fiatAmount).toLocaleString('he-IL', { maximumFractionDigits: 0 })}</td>
                    <td style={{ padding: '8px 10px', color: '#fbbf24', whiteSpace: 'nowrap' }}>₪{Number(order.feeAmount).toLocaleString('he-IL', { maximumFractionDigits: 0 })}</td>
                    <td style={{ padding: '8px 10px', color: '#64748b' }}>{order.paymentMethodRequested}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ color: ORDER_STATUS_COLOR[order.status] ?? '#94a3b8', fontWeight: 600, fontSize: 11 }}>
                        {ORDER_STATUS_HE[order.status] ?? order.status}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <Link href={`/${locale}/admin/orders/${order.id}`}
                        style={{ color: '#3b82f6', fontSize: 11 }}>צפה</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Log */}
      {user.auditLogsAsSubject.length > 0 && (
        <div style={{ ...card }}>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: '0 0 14px' }}>🔍 לוג פעילות ({user.auditLogsAsSubject.length} אחרונות)</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {user.auditLogsAsSubject.map(log => (
              <div key={log.id} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'flex-start' }}>
                <span style={{ color: '#475569', fontSize: 10, whiteSpace: 'nowrap', marginTop: 2 }}>
                  {new Date(log.createdAt).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
                <div style={{ flex: 1 }}>
                  <span style={{ color: '#60a5fa', fontSize: 12, fontWeight: 600 }}>{log.action}</span>
                  {log.description && <p style={{ color: '#94a3b8', fontSize: 11, margin: '2px 0 0' }}>{log.description}</p>}
                </div>
                {log.actorRole && (
                  <span style={{ color: '#475569', fontSize: 10, whiteSpace: 'nowrap' }}>{log.actorRole}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
