import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { getAppleAuthUrl } from '@/lib/oauth';

const STATE_COOKIE = 'oauth_state_apple';

export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get('locale') ?? 'he';
  const state = `${locale}.${randomBytes(16).toString('hex')}`;

  const cookieStore = await cookies();
  // Apple's callback arrives as a cross-site POST (response_mode=form_post),
  // which SameSite=Lax does not send — None is required here (Strict/Lax break the flow).
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(getAppleAuthUrl(state));
}
