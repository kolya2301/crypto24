import { NextRequest } from 'next/server';
import { getSessionFromRequest, isComplianceOrAdmin } from '@/lib/auth';
import { kycService } from '@/lib/services/kyc.service';
import { ok, unauthorized, forbidden, notFound, serverError } from '@/lib/api-response';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();
  if (!isComplianceOrAdmin(session)) return forbidden();

  try {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    const result = await kycService.runSanctionsCheck(params.id, session.sub, ip);
    return ok(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'USER_NOT_FOUND') return notFound();
    return serverError();
  }
}
