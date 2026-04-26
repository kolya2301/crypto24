import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';

const locales = ['he', 'ru', 'en', 'ar'];

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;
  if (!locales.includes(locale)) notFound();

  const messages = await getMessages();
  const dir = (locale === 'he' || locale === 'ar') ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0f172a" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { height: 100%; font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; }
          body { -webkit-font-smoothing: antialiased; }
          a { text-decoration: none; }
          button { font-family: inherit; }
          input, select, textarea { font-family: inherit; }
        `}</style>
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
