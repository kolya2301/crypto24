import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

const inputStyle = {
  width: '100%', height: 46, padding: '0 14px',
  background: 'rgba(255,255,255,0.06)',
  border: '1.5px solid rgba(255,255,255,0.12)',
  borderRadius: 10, color: 'white', fontSize: 14,
  outline: 'none', boxSizing: 'border-box' as const,
  fontFamily: 'inherit',
};

const labelStyle = {
  display: 'block' as const, color: '#94a3b8',
  fontSize: 12, fontWeight: 700, letterSpacing: 0.3,
  marginBottom: 8, textTransform: 'uppercase' as const,
};

const card = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 20, padding: '24px',
} as const;

export default async function SettingsPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { email: true, fullName: true, phone: true, residencyCountry: true },
  });
  if (!user) redirect(`/${locale}/login`);

  const isRtl = locale === 'he';

  const L = locale === 'he' ? {
    title: 'הגדרות',
    profile: 'פרופיל', security: 'אבטחה', preferences: 'העדפות',
    email: 'אימייל', name: 'שם מלא', phone: 'טלפון', country: 'מדינת מגורים',
    changePassword: 'שינוי סיסמה',
    currentPassword: 'סיסמה נוכחית', newPassword: 'סיסמה חדשה', confirmPassword: 'אשר סיסמה',
    language: 'שפה', hebrew: 'עברית', russian: 'רוסית', save: 'שמור שינויים',
    saveDesc: 'השינויים יישמרו מיד',
  } : {
    title: 'Настройки',
    profile: 'Профиль', security: 'Безопасность', preferences: 'Настройки',
    email: 'Email', name: 'Полное имя', phone: 'Телефон', country: 'Страна',
    changePassword: 'Смена пароля',
    currentPassword: 'Текущий пароль', newPassword: 'Новый пароль', confirmPassword: 'Подтвердите пароль',
    language: 'Язык', hebrew: 'Иврит', russian: 'Русский', save: 'Сохранить',
    saveDesc: 'Изменения сохранятся немедленно',
  };

  return (
    <div style={{
      padding: '28px 24px', maxWidth: 640, margin: '0 auto',
      fontFamily: "'Inter', -apple-system, sans-serif",
      direction: isRtl ? 'rtl' : 'ltr',
    }}>

      <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: '0 0 28px' }}>
        ⚙️ {L.title}
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Profile */}
        <div style={card}>
          <h2 style={{ color: 'white', fontSize: 16, fontWeight: 700, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
            👤 {L.profile}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>{L.email}</label>
              <input type="email" defaultValue={user.email} disabled style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
            </div>
            <div>
              <label style={labelStyle}>{L.name}</label>
              <input type="text" defaultValue={user.fullName ?? ''} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{L.phone}</label>
              <input type="tel" defaultValue={user.phone ?? ''} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{L.country}</label>
              <input type="text" defaultValue={user.residencyCountry ?? ''} style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Security */}
        <div style={card}>
          <h2 style={{ color: 'white', fontSize: 16, fontWeight: 700, margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
            🔐 {L.security}
          </h2>
          <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 20px' }}>{L.changePassword}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>{L.currentPassword}</label>
              <input type="password" placeholder="••••••••" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{L.newPassword}</label>
              <input type="password" placeholder="••••••••" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{L.confirmPassword}</label>
              <input type="password" placeholder="••••••••" style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div style={card}>
          <h2 style={{ color: 'white', fontSize: 16, fontWeight: 700, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
            ✨ {L.preferences}
          </h2>
          <div>
            <label style={labelStyle}>{L.language}</label>
            <select
              defaultValue={locale}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="he" style={{ background: '#0f172a' }}>{L.hebrew}</option>
              <option value="ru" style={{ background: '#0f172a' }}>{L.russian}</option>
            </select>
          </div>
        </div>

        {/* Save */}
        <div>
          <button style={{
            width: '100%', height: 50,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            border: 'none', borderRadius: 14,
            color: 'white', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 20px rgba(59,130,246,0.3)',
          }}>
            {L.save}
          </button>
          <p style={{ color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 8 }}>{L.saveDesc}</p>
        </div>
      </div>
    </div>
  );
}
