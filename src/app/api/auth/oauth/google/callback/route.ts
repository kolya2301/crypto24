import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeGoogleCode } from '@/lib/oauth';
import { loginOrRegisterViaOAuth } from '@/lib/services/oauth-login.service';
import { makeSessionCookie } from '@/lib/auth';

const STATE_COOKIE = 'oauth_state';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  const locale = state?.split('.')[0] ?? 'he';

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(new URL(`/${locale}/login?error=oauth_failed`, req.url));
  }

  try {
    const profile = await exchangeGoogleCode(code);
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    const userAgent = req.headers.get('user-agent') ?? '';

    const { token, needsProfileCompletion } = await loginOrRegisterViaOAuth('google', profile, ip, userAgent);

    const cookie = makeSessionCookie(token);
    cookieStore.set(cookie.name, cookie.value, cookie.options as Parameters<typeof cookieStore.set>[2]);

    const destination = needsProfileCompletion ? `/${locale}/complete-profile` : `/${locale}/dashboard`;
    return NextResponse.redirect(new URL(destination, req.url));
  } catch {
    return NextResponse.redirect(new URL(`/${locale}/login?error=oauth_failed`, req.url));
  }
}
