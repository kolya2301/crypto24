import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeAppleCode } from '@/lib/oauth';
import { loginOrRegisterViaOAuth } from '@/lib/services/oauth-login.service';
import { makeSessionCookie } from '@/lib/auth';

const STATE_COOKIE = 'oauth_state_apple';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const code = form.get('code')?.toString();
  const state = form.get('state')?.toString();

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  const locale = state?.split('.')[0] ?? 'he';

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(new URL(`/${locale}/login?error=oauth_failed`, req.url));
  }

  try {
    const profile = await exchangeAppleCode(code);
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    const userAgent = req.headers.get('user-agent') ?? '';

    const { token, needsProfileCompletion } = await loginOrRegisterViaOAuth('apple', profile, ip, userAgent);

    const cookie = makeSessionCookie(token);
    cookieStore.set(cookie.name, cookie.value, cookie.options as Parameters<typeof cookieStore.set>[2]);

    const destination = needsProfileCompletion ? `/${locale}/complete-profile` : `/${locale}/dashboard`;
    return NextResponse.redirect(new URL(destination, req.url));
  } catch {
    return NextResponse.redirect(new URL(`/${locale}/login?error=oauth_failed`, req.url));
  }
}
