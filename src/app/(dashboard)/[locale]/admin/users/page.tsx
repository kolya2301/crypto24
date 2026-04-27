import { getSession, isComplianceOrAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';

const KYC_COLOR: Record<string, string> = {
  approved: '#34d399', pending_review: '#60a5fa', rejected: '#f87171',
  not_submitted: '#475569', expired: '#fb923c', more_info_required: '#fbbf24',
};
const KYC_HE: Record<string, string> = {
  approved: 'מאושר', pending_review: 'בבדיקה', rejected: 'נדחה',
  not_submitted: 'לא הוגש', expired: 'פג תוקף', more_info_required: 'מידע נוסף',
};
const ROLE_COLOR: Record<string, string> = {
  admin: '#f59e0b', compliance_officer: '#8b5cf6', finance_operator: '#3b82f6',
  registered_user: '#64748b', visitor: '#334155',
};
const STATUS_COLOR: Record<string, string> = {
  active: '#34d399', suspended: '#f87171', pending_verification: '#fbbf24', deactivated: '#475569',
};

const card = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 20,
} as const;

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { kycStatus?: string; status?: string; role?: string; search?: string; page?: string };
}) {
  const { locale } = params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isComplianceOrAdmin(session)) redirect(`/${locale}/dashboard`);

  const page = parseInt(searchParams.page ?? '1', 10);
  const limit = 30;
  const { kycStatus, status, role, search } = searchParams;

  const where = {
    ...(kycStatus && { kycProfile: { status: kycStatus as never } }),
    ...(status && { status: status as never }),
    ...(role && { role: role as never }),
    ...(search && {
      OR: [
        { email: { contains: search, mode: 'insensitive' as const } },
        { fullName: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search } },
      ],
    }),
  };

  const [users, total, stats] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, fullName: true, phone: true,
        role: true, status: true, riskScore: true,
        lastLoginAt: true, createdAt: true, residencyCountry: true,
        kycProfile: { select: { status: true, level: true, sanctionsFlag: true, pepFlag: true } },
        _count: { select: { orders: true } },
        orders: {
          where: { status: OrderStatus.completed },
          select: { fiatAmount: true },
        },
      },
    }),
    prisma.user.count({ where }),
    Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'active' } }),
      prisma.user.count({ where: { kycProfile: { status: 'approved' } } }),
      prisma.user.count({ where: { kycProfile: { status: 'pending_review' } } }),
      prisma.user.count({ where: { riskScore: { gt: 70 } } }),
    ]),
  ]);

  const [totalUsers, activeUsers, kycApproved, kycPending, highRisk] = stats;
  const pages = Math.ceil(total / limit);

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const p = { kycStatus, status, role, search, page: '1', ...overrides };
    const qs = Object.entries(p).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join('&');
    return `/${locale}/admin/users${qs ? `?${qs}` : ''}`;
  };

  const ROLE_FILTERS = [
    { key: '', label: 'כל התפקידים' },
    { key: 'admin', label: '👑 Admin' },
    { key: 'compliance_officer', label: '🛡 Compliance' },
    { key: 'finance_operator', label: '💼 Finance' },
    { key: 'registered_user', label: '👤 משתמש' },
  ];
  const STATUS_FILTERS = [
    { key: '', label: 'כל הסטטוסים' },
    { key: 'active', label: '✅ פעיל' },
    { key: 'suspended', label: '🚫 מושהה' },
    { key: 'pending_verification', label: '⏳ ממתין' },
    { key: 'deactivated', label: '⛔ מבוטל' },
  ];
  const KYC_FILTERS = [
    { key: '', label: 'כל KYC' },
    { key: 'pending_review', label: '🕐 ממתין' },
    { key: 'approved', label: '✅ מאושר' },
    { key: 'rejected', label: '❌ נדחה' },
    { key: 'not_submitted', label: '⭕ לא הוגש' },
  ];

  return (
    <div style={{ padding: '28px 24px', maxWidth: 1200, margin: '0 auto', fontFamily: "'Inter', sans-serif", direction: 'rtl' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: 0 }}>👥 ניהול משתמשים</h1>
        <Link href={`/${locale}/admin`} style={{ color: '#64748b', fontSize: 13 }}>← חזרה לניהול</Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'סה"כ משתמשים', value: totalUsers, color: '#60a5fa' },
          { label: 'פעילים', value: activeUsers, color: '#34d399' },
          { label: 'KYC מאושר', value: kycApproved, color: '#a3e635' },
          { label: 'KYC ממתין', value: kycPending, color: '#fbbf24' },
          { label: 'סיכון גבוה', value: highRisk, color: '#f87171' },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: '14px 18px' }}>
            <p style={{ color: '#64748b', fontSize: 11, margin: 0, marginBottom: 4 }}>{s.label}</p>
            <p style={{ color: s.color, fontSize: 22, fontWeight: 800, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <form method="GET" style={{ marginBottom: 16 }}>
        <input type="hidden" name="kycStatus" value={kycStatus ?? ''} />
        <input type="hidden" name="status" value={status ?? ''} />
        <input type="hidden" name="role" value={role ?? ''} />
        <input
          name="search"
          defaultValue={search ?? ''}
          placeholder="חיפוש לפי שם, אימייל, טלפון..."
          style={{
            width: '100%', padding: '10px 16px', borderRadius: 12,
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box',
            textAlign: 'right',
          }}
        />
      </form>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {ROLE_FILTERS.map(f => (
          <Link key={f.key} href={buildUrl({ role: f.key || undefined })}
            style={{
              padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, textDecoration: 'none',
              background: (role ?? '') === f.key ? ROLE_COLOR[f.key] ?? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
              color: (role ?? '') === f.key ? 'white' : '#94a3b8',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>{f.label}</Link>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {STATUS_FILTERS.map(f => (
          <Link key={f.key} href={buildUrl({ status: f.key || undefined })}
            style={{
              padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, textDecoration: 'none',
              background: (status ?? '') === f.key ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
              color: (status ?? '') === f.key ? 'white' : '#94a3b8',
              border: `1px solid ${(status ?? '') === f.key ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
            }}>{f.label}</Link>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {KYC_FILTERS.map(f => (
          <Link key={f.key} href={buildUrl({ kycStatus: f.key || undefined })}
            style={{
              padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, textDecoration: 'none',
              background: (kycStatus ?? '') === f.key ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
              color: (kycStatus ?? '') === f.key ? 'white' : '#94a3b8',
              border: `1px solid ${(kycStatus ?? '') === f.key ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
            }}>{f.label}</Link>
        ))}
      </div>

      <p style={{ color: '#475569', fontSize: 12, marginBottom: 12 }}>מציג {users.length} מתוך {total} משתמשים</p>

      {/* Table */}
      <div style={{ ...card, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['משתמש', 'טלפון', 'תפקיד', 'סטטוס', 'KYC', 'ריסק', 'עסקאות', 'נפח ₪', 'הצטרף', ''].map(h => (
                <th key={h} style={{ padding: '10px 14px', color: '#64748b', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#475569' }}>לא נמצאו משתמשים</td></tr>
            )}
            {users.map(user => {
              const volume = user.orders.reduce((s, o) => s + Number(o.fiatAmount), 0);
              const kyc = user.kycProfile;
              return (
                <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {/* Name + email */}
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        background: 'rgba(59,130,246,0.15)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 800, color: '#60a5fa',
                      }}>
                        {(user.fullName ?? user.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p style={{ color: 'white', fontWeight: 600, margin: 0, fontSize: 13 }}>{user.fullName}</p>
                        <p style={{ color: '#64748b', margin: 0, fontSize: 11 }}>{user.email}</p>
                      </div>
                    </div>
                  </td>
                  {/* Phone */}
                  <td style={{ padding: '12px 14px', color: '#94a3b8', fontSize: 12 }}>{user.phone || '—'}</td>
                  {/* Role */}
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: `${ROLE_COLOR[user.role]}22`,
                      color: ROLE_COLOR[user.role] ?? '#94a3b8',
                    }}>{user.role.replace('_', ' ')}</span>
                  </td>
                  {/* Status */}
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ color: STATUS_COLOR[user.status] ?? '#94a3b8', fontSize: 12, fontWeight: 600 }}>
                      {user.status === 'active' ? '● ' : '○ '}{user.status}
                    </span>
                  </td>
                  {/* KYC */}
                  <td style={{ padding: '12px 14px' }}>
                    <div>
                      <span style={{ color: KYC_COLOR[kyc?.status ?? 'not_submitted'], fontSize: 12, fontWeight: 600 }}>
                        {KYC_HE[kyc?.status ?? 'not_submitted']}
                      </span>
                      {kyc?.level && kyc.level !== 'none' && (
                        <p style={{ color: '#475569', fontSize: 10, margin: '2px 0 0' }}>{kyc.level}</p>
                      )}
                      {(kyc?.sanctionsFlag || kyc?.pepFlag) && (
                        <p style={{ color: '#f87171', fontSize: 10, margin: '2px 0 0' }}>
                          🚨 {kyc.sanctionsFlag ? 'Sanctions' : ''} {kyc.pepFlag ? 'PEP' : ''}
                        </p>
                      )}
                    </div>
                  </td>
                  {/* Risk */}
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      color: user.riskScore > 70 ? '#f87171' : user.riskScore > 40 ? '#fbbf24' : '#34d399',
                      fontWeight: 700, fontSize: 13,
                    }}>{user.riskScore}</span>
                  </td>
                  {/* Orders */}
                  <td style={{ padding: '12px 14px', color: '#94a3b8', textAlign: 'center' }}>{user._count.orders}</td>
                  {/* Volume */}
                  <td style={{ padding: '12px 14px', color: volume > 0 ? '#a3e635' : '#475569', fontWeight: volume > 0 ? 600 : 400, whiteSpace: 'nowrap' }}>
                    {volume > 0 ? `₪${volume.toLocaleString('he-IL', { maximumFractionDigits: 0 })}` : '—'}
                  </td>
                  {/* Joined */}
                  <td style={{ padding: '12px 14px', color: '#475569', fontSize: 11, whiteSpace: 'nowrap' }}>
                    {new Date(user.createdAt).toLocaleDateString('he-IL')}
                  </td>
                  {/* Action */}
                  <td style={{ padding: '12px 14px' }}>
                    <Link href={`/${locale}/admin/users/${user.id}`}
                      style={{
                        padding: '5px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                        background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                        border: '1px solid rgba(59,130,246,0.25)', textDecoration: 'none',
                        whiteSpace: 'nowrap',
                      }}>
                      פרופיל →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20, flexWrap: 'wrap' }}>
          {Array.from({ length: Math.min(pages, 12) }, (_, i) => i + 1).map(p => (
            <Link key={p} href={buildUrl({ page: String(p) })}
              style={{
                width: 34, height: 34, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 600, textDecoration: 'none',
                background: p === page ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.05)',
                color: p === page ? 'white' : '#64748b',
              }}>{p}</Link>
          ))}
        </div>
      )}
    </div>
  );
}
