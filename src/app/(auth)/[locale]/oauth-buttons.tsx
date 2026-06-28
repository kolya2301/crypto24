'use client';

const labels = {
  he: { google: 'המשך עם Google', apple: 'המשך עם Apple', divider: 'או' },
  ru: { google: 'Продолжить с Google', apple: 'Продолжить с Apple', divider: 'или' },
};

const appleEnabled = process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED === 'true';

const buttonStyle = {
  width: '100%', height: '48px',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
  background: 'rgba(255,255,255,0.08)',
  border: '1.5px solid rgba(255,255,255,0.2)',
  borderRadius: '12px',
  color: 'white', fontSize: '14px', fontWeight: '600' as const,
  cursor: 'pointer', textDecoration: 'none',
  fontFamily: 'inherit',
};

export default function OAuthButtons({ locale }: { locale: string }) {
  const lbl = labels[locale as 'he' | 'ru'] ?? labels.he;

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <a href={`/api/auth/oauth/google?locale=${locale}`} style={buttonStyle}>
          <span aria-hidden style={{ fontSize: '16px' }}>G</span>
          {lbl.google}
        </a>
        {appleEnabled && (
          <a href={`/api/auth/oauth/apple?locale=${locale}`} style={buttonStyle}>
            <span aria-hidden style={{ fontSize: '16px' }}></span>
            {lbl.apple}
          </a>
        )}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        margin: '24px 0', color: '#475569', fontSize: '12px',
      }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.12)' }} />
        {lbl.divider}
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.12)' }} />
      </div>
    </div>
  );
}
