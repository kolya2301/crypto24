import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 20, padding: '22px 24px',
};

export default async function ProfilePage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const session = await getSession();
  if (!session) return null;
  const isRtl = locale === 'he';

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true, fullName: true, phone: true, role: true, status: true, createdAt: true, lastLoginAt: true, riskScore: true },
  });
  if (!user) return null;

  const isAdmin = ['admin', 'finance_operator', 'compliance_officer'].includes(session.role);

  const L = locale === 'he' ? {
    title: 'הפרופיל שלי',
    name: 'שם מלא', email: 'אימייל', phone: 'טלפון',
    role: 'תפקיד', status: 'סטטוס', joined: 'הצטרף', lastLogin: 'כניסה אחרונה',
    adminPanel: 'פאנל ניהול', kycBtn: 'אימות זהות (KYC)', settings: 'הגדרות',
  } : {
    title: 'Мой профиль',
    name: 'Полное имя', email: 'Email', phone: 'Телефон',
    role: 'Роль', status: 'Статус', joined: 'Дата регистрации', lastLogin: 'Последний вход',
    adminPanel: 'Панель управления', kycBtn: 'Верификация (KYC)', settings: 'Настройки',
  };

  return (
    <div style={{
      padding: '28px 24px', maxWidth: 540, margin: '0 auto',
      fontFamily: "'Inter', -apple-system, sans-serif",
      direction: isRtl ? 'rtl' : 'ltr',
    }}>

      <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: '0 0 24px' }}>
        👤 {L.title}
      </h1>

      {/* Avatar card */}
      <div style={{
        ...card, marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 16,
        flexDirection: isRtl ? 'row-reverse' : 'row',
        background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))',
        border: '1px solid rgba(59,130,246,0.2)',
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: 18, flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(139,92,246,0.3))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 800, color: '#93c5fd',
        }}>
          {(user.fullName ?? user.email)[0].toUpperCase()}
        </div>
        <div style={{ textAlign: isRtl ? 'right' : 'left' }}>
          <p style={{ color: 'white', fontSize: 17, fontWeight: 700, margin: 0 }}>{user.fullName ?? '—'}</p>
          <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>{user.email}</p>
          <span style={{
            display: 'inline-block', marginTop: 6, padding: '2px 10px', borderRadius: 99,
            background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)',
            color: '#60a5fa', fontSize: 11, fontWeight: 700,
          }}>
            {user.role}
          </span>
        </div>
      </div>

      {/* Info card */}
      <div style={{ ...card, marginBottom: 16 }}>
        {[
          { label: L.name, value: user.fullName ?? '—' },
          { label: L.email, value: user.email },
          { label: L.phone, value: user.phone ?? '—' },
          { label: L.status, value: user.status },
          { label: L.joined, value: new Date(user.createdAt).toLocaleDateString(isRtl ? 'he-IL' : 'ru-RU') },
          { label: L.lastLogin, value: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString(isRtl ? 'he-IL' : 'ru-RU') : '—' },
        ].map(({ label, value }, i, arr) => (
          <div key={label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexDirection: isRtl ? 'row-reverse' : 'row',
            padding: '11px 0',
            borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
          }}>
            <span style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>{label}</span>
            <span style={{ color: 'white', fontSize: 13, fontWeight: 500 }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Link href={`/${locale}/kyc`} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexDirection: isRtl ? 'row-reverse' : 'row',
          padding: '16px 20px', borderRadius: 16,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
          textDecoration: 'none', transition: 'border 0.15s',
        }}>
          <span style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>{L.kycBtn}</span>
          <span style={{ fontSize: 20 }}>🪪</span>
        </Link>

        <Link href={`/${locale}/settings`} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexDirection: isRtl ? 'row-reverse' : 'row',
          padding: '16px 20px', borderRadius: 16,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
          textDecoration: 'none',
        }}>
          <span style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>{L.settings}</span>
          <span style={{ fontSize: 20 }}>⚙️</span>
        </Link>

        {isAdmin && (
          <Link href={`/${locale}/admin`} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexDirection: isRtl ? 'row-reverse' : 'row',
            padding: '16px 20px', borderRadius: 16,
            background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)',
            textDecoration: 'none',
          }}>
            <span style={{ color: '#60a5fa', fontSize: 14, fontWeight: 700 }}>{L.adminPanel}</span>
            <span style={{ fontSize: 20 }}>🛡️</span>
          </Link>
        )}
      </div>
    </div>
  );
}
