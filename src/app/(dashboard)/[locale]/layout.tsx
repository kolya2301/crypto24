import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

const locales = ['he', 'ru', 'en', 'ar'];

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;
  if (!locales.includes(locale)) notFound();

  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const messages = await getMessages();
  const isRtl = locale === 'he' || locale === 'ar';

  return (
    <html lang={locale} dir={isRtl ? 'rtl' : 'ltr'} className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#050C18" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { height: 100%; background: #050C18; color: #f1f5f9; font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; }
          body { overscroll-behavior: none; -webkit-font-smoothing: antialiased; }
          a { color: inherit; text-decoration: none; }
          button { font-family: inherit; }
          input, select, textarea { font-family: inherit; }
          ::-webkit-scrollbar { width: 4px; height: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 99px; }
          #dash-desktop { display: none; height: 100vh; overflow: hidden; background: #050C18; }
          #dash-mobile  { display: flex; flex-direction: column; min-height: 100dvh; background: #050C18; }
          @media (min-width: 1024px) {
            #dash-desktop { display: flex; }
            #dash-mobile  { display: none; }
          }
          @media (max-width: 1023px) {
            input, select, textarea { font-size: 16px !important; }
          }
        `}</style>
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>

          {/* Desktop layout */}
          <div id="dash-desktop">
            <DashboardSidebar locale={locale} userEmail={session.email} userRole={session.role} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#07111f' }}>
              <main style={{ flex: 1, overflowY: 'auto' }}>
                {children}
              </main>
            </div>
          </div>

          {/* Mobile layout */}
          <div id="dash-mobile">
            <header style={{
              position: 'sticky', top: 0, zIndex: 50,
              background: 'rgba(5,12,24,0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              padding: '0 16px',
              height: 56,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 9,
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 13, color: 'white',
                }}>₿</div>
                <span style={{ fontWeight: 800, fontSize: 15, color: 'white', letterSpacing: '-0.3px' }}>crypto24</span>
              </div>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(59,130,246,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#60a5fa',
              }}>
                {session.email[0].toUpperCase()}
              </div>
            </header>

            <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
              {children}
            </main>

            <MobileBottomNav locale={locale} userRole={session.role} />
          </div>

        </NextIntlClientProvider>
      </body>
    </html>
  );
}
