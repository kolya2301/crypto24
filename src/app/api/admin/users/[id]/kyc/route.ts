import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSessionFromRequest, isComplianceOrAdmin } from '@/lib/auth';
import { kycService } from '@/lib/services/kyc.service';
import { ok, unauthorized, forbidden, notFound, validationError, serverError } from '@/lib/api-response';
import { KycStatus, KycLevel } from '@prisma/client';

const schema = z.object({
  status: z.nativeEnum(KycStatus),
  level: z.nativeEnum(KycLevel).optional(),
  rejectionReason: z.string().max(1000).optional(),
  internalNotes: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();
  if (!isComplianceOrAdmin(session)) return forbidden();

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationError('Validation failed', parsed.error.flatten());

    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    const profile = await kycService.reviewKyc({
      userId: params.id,
      ...parsed.data,
      reviewerUserId: session.sub,
      ip,
    });

    return ok(profile);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('not found')) return notFound();
    return serverError();
  }
}
