import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { getSession } from '@/lib/auth';

const locales = ['he', 'ru', 'en', 'ar'];

export const metadata: Metadata = {
  title: {
    template: '%s | crypto24',
    default: 'crypto24 — פלטפורמת קריפטו מוסדרת בישראל',
  },
  description: 'פלטפורמה מוסדרת לקנייה ומכירה של מטבעות דיגיטליים עם אימות מלא ועמידה בדרישות AML/KYC',
};

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;

  if (!locales.includes(locale)) notFound();

  const messages = await getMessages();
  const session = await getSession();
  const isRtl = locale === 'he' || locale === 'ar';

  return (
    <html lang={locale} dir={isRtl ? 'rtl' : 'ltr'} className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#050C18" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body style={{ background: '#050C18', color: '#fff', margin: 0, padding: 0, fontFamily: "'Inter', -apple-system, sans-serif", WebkitFontSmoothing: 'antialiased' }}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Navbar locale={locale} user={session ? { email: session.email } : null} />
          <main>{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
