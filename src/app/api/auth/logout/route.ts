import { NextRequest } from 'next/server';
import { ok } from '@/lib/api-response';
import { clearSessionCookie, getSessionFromRequest } from '@/lib/auth';
import { cookies } from 'next/headers';
import { audit, auditActions } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (session) {
    await audit({
      actorUserId: session.sub,
      action: auditActions.USER_LOGOUT,
      ipAddress: req.headers.get('x-forwarded-for') ?? 'unknown',
    });
  }
  const c = clearSessionCookie();
  const cookieStore = await cookies();
  cookieStore.set(c.name, c.value, c.options as Parameters<typeof cookieStore.set>[2]);
  return ok({ message: 'Logged out' });
}
