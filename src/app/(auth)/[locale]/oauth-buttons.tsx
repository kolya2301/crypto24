'use client';

const labels = {
  he: { google: 'המשך עם Google', apple: 'המשך עם Apple', divider: 'או' },
  ru: { google: 'Продолжить с Google', apple: 'Продолжить с Apple', divider: 'или' },
};

const appleEnabled = process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED === 'true';

const googleButtonStyle = {
  width: '100%', height: '48px',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
  background: '#ffffff',
  border: '1px solid #dadce0',
  borderRadius: '12px',
  color: '#3c4043', fontSize: '14px', fontWeight: '600' as const,
  cursor: 'pointer', textDecoration: 'none',
  fontFamily: "'Roboto', 'Inter', -apple-system, sans-serif",
  boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
  transition: 'box-shadow 0.2s, background 0.2s',
};

const appleButtonStyle = {
  width: '100%', height: '48px',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
  background: 'rgba(255,255,255,0.08)',
  border: '1.5px solid rgba(255,255,255,0.2)',
  borderRadius: '12px',
  color: 'white', fontSize: '14px', fontWeight: '600' as const,
  cursor: 'pointer', textDecoration: 'none',
  fontFamily: 'inherit',
};

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.8 2.73v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.63z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.91-2.26c-.81.54-1.85.86-3.05.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33C2.44 15.98 5.48 18 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.71c-.18-.54-.28-1.11-.28-1.71s.1-1.17.28-1.71V4.96H.96C.35 6.17 0 7.55 0 9s.35 2.83.96 4.04l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

export default function OAuthButtons({ locale }: { locale: string }) {
  const lbl = labels[locale as 'he' | 'ru'] ?? labels.he;

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <a
          href={`/api/auth/oauth/google?locale=${locale}`}
          style={googleButtonStyle}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 6px rgba(0,0,0,0.18)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 2px rgba(0,0,0,0.08)'; }}
        >
          <GoogleLogo />
          {lbl.google}
        </a>
        {appleEnabled && (
          <a href={`/api/auth/oauth/apple?locale=${locale}`} style={appleButtonStyle}>
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
