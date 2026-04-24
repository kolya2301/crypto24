import { getSession, isComplianceOrAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

const KYC_COLORS: Record<string, string> = {
  approved: '#34d399', submitted: '#fbbf24', pending_review: '#60a5fa',
  rejected: '#f87171', not_submitted: '#64748b', under_review: '#60a5fa',
};

const KYC_HE: Record<string, string> = {
  approved: '✅ מאושר', submitted: '📤 הוגש', pending_review: '🕐 בבדיקה',
  rejected: '❌ נדחה', not_submitted: 'לא הוגש', under_review: '🔍 בבדיקה',
  pending_additional_info: '📎 מידע נוסף',
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
  searchParams: { kycStatus?: string; search?: string; page?: string };
}) {
  const { locale } = params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  if (!isComplianceOrAdmin(session)) redirect(`/${locale}/dashboard`);

  const page = parseInt(searchParams.page ?? '1', 10);
  const limit = 25;
  const { kycStatus, search } = searchParams;

  const where = {
    ...(kycStatus && { kycProfile: { status: kycStatus as never } }),
    ...(search && {
      OR: [
        { email: { contains: search, mode: 'insensitive' as const } },
        { fullName: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, fullName: true, phone: true,
        role: true, status: true, riskScore: true,
        lastLoginAt: true, createdAt: true,
        kycProfile: { select: { status: true, level: true, sanctionsFlag: true, pepFlag: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const pages = Math.ceil(total / limit);

  const KYC_FILTERS = [
    { key: '', label: 'כולם' },
    { key: 'pending_review', label: '🕐 ממתין אישור' },
    { key: 'approved', label: '✅ מאושר' },
    { key: 'rejected', label: '❌ נדחה' },
    { key: 'not_submitted', label: '⭕ לא הוגש' },
  ];

  return (
    <div style={{
      padding: '28px 24px', maxWidth: 1000, margin: '0 auto',
      fontFamily: "'Inter', -apple-system, sans-serif",
      direction: 'rtl',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row-reverse', marginBottom: 24 }}>
        <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: 0 }}>👥 ניהול משתמשים</h1>
        <Link href={`/${locale}/admin`} style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>→ חזרה לניהול</Link>
      </div>

      {/* KYC filter tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {KYC_FILTERS.map(f => {
          const isActive = (kycStatus ?? '') === f.key;
          return (
            <Link
              key={f.key}
              href={`/${locale}/admin/users${f.key ? `?kycStatus=${f.key}` : ''}`}
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

      <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16, textAlign: 'right' }}>{total} משתמשים</p>

      {/* Users list */}
      <div style={card}>
        {users.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b', fontSize: 14 }}>אין משתמשים</div>
        )}
        {users.map((user, idx) => (
          <Link
            key={user.id}
            href={`/${locale}/admin/users/${user.id}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 14, flexDirection: 'row-reverse',
              padding: '14px 20px',
              borderBottom: idx < users.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              textDecoration: 'none',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {/* Avatar */}
            <div style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(59,130,246,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 800, color: '#60a5fa',
            }}>
              {(user.fullName ?? user.email)[0].toUpperCase()}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
              <p style={{ color: 'white', fontWeight: 600, fontSize: 14, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.fullName ?? user.email}
              </p>
              <p style={{ color: '#64748b', fontSize: 12, margin: '3px 0 0' }}>
                {user.phone && <>{user.phone} · </>}{user.email}
              </p>
            </div>

            {/* Status */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, flexShrink: 0 }}>
              <span style={{
                color: KYC_COLORS[user.kycProfile?.status ?? 'not_submitted'],
                fontSize: 12, fontWeight: 600,
              }}>
                KYC: {KYC_HE[user.kycProfile?.status ?? 'not_submitted']}
              </span>
              {(user.kycProfile?.sanctionsFlag || user.kycProfile?.pepFlag) && (
                <span style={{ color: '#f87171', fontSize: 11, fontWeight: 600 }}>
                  🚨 {user.kycProfile?.sanctionsFlag ? 'Sanctions' : 'PEP'}
                </span>
              )}
              {user.riskScore > 70 && (
                <span style={{ color: '#fb923c', fontSize: 11, fontWeight: 600 }}>⚠️ Risk: {user.riskScore}</span>
              )}
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
              href={`/${locale}/admin/users?page=${p}${kycStatus ? `&kycStatus=${kycStatus}` : ''}`}
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
