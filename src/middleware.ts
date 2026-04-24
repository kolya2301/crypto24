import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from './lib/auth';
import createIntlMiddleware from 'next-intl/middleware';

export const locales = ['he', 'ru', 'en', 'ar'] as const;
export type Locale = typeof locales[number];
export const defaultLocale: Locale = 'he';

const intlMiddleware = createIntlMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: 'always',
});

const PROTECTED_PATTERNS = [
  /^\/[a-z]{2}\/(dashboard|profile|kyc|orders|wallets|settings|payment-methods|notifications)/,
];

const ADMIN_PATTERNS = [
  /^\/[a-z]{2}\/admin/,
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes — skip locale redirect
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Run intl middleware first
  const intlResponse = intlMiddleware(request);

  // Check protected routes
  const isProtected = PROTECTED_PATTERNS.some(p => p.test(pathname));
  const isAdmin = ADMIN_PATTERNS.some(p => p.test(pathname));

  if (isProtected || isAdmin) {
    const session = await getSessionFromRequest(request);

    if (!session) {
      const locale = pathname.split('/')[1] || defaultLocale;
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (isAdmin && session.role !== 'admin' && session.role !== 'compliance_officer' && session.role !== 'finance_operator') {
      const locale = pathname.split('/')[1] || defaultLocale;
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }
  }

  return intlResponse;
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};
