import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { getGoogleAuthUrl } from '@/lib/oauth';

const STATE_COOKIE = 'oauth_state';

export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get('locale') ?? 'he';
  const state = `${locale}.${randomBytes(16).toString('hex')}`;

  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(getGoogleAuthUrl(state));
}
