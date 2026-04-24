import { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { authService } from '@/lib/services/auth.service';
import { ok, unauthorized, serverError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();
  try {
    const profile = await authService.getProfile(session.sub);
    return ok(profile);
  } catch {
    return serverError();
  }
}
