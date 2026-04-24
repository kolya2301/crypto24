import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import '@/app/globals.css';

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
    <html lang={locale} dir={dir} className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#050C18" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="gradient-hero min-h-screen bg-background text-foreground antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-12">
            {/* Logo */}
            <Link href={`/${locale}`} className="group mb-10 flex items-center gap-3 transition hover:scale-105 active:scale-95">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-brand shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-all">
                <span className="text-xl font-bold text-white">₿</span>
              </div>
              <span className="text-2xl font-black tracking-tight text-white italic">crypto24</span>
            </Link>

            <div className="w-full max-w-sm animate-scale-in">
              {children}
            </div>

            <p className="mt-10 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 max-w-xs">
              {locale === 'he'
                ? 'בהרשמה אתה מסכים לתנאי השימוש ולמדיניות הפרטיות שלנו.'
                : 'Регистрируясь, вы соглашаетесь с нашими условиями использования и политикой конфиденциальности.'}
            </p>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
