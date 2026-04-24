import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSessionFromRequest } from '@/lib/auth';
import { kycService } from '@/lib/services/kyc.service';
import { ok, unauthorized, validationError, serverError } from '@/lib/api-response';

const submitSchema = z.object({
  dateOfBirth: z.string().date(),
  idNumber: z.string().min(5).max(20),
  idType: z.enum(['il_id', 'passport']),
  address: z.string().min(5).max(200),
  city: z.string().min(2).max(100),
  postalCode: z.string().min(3).max(20),
  country: z.string().length(2),
  sourceOfFunds: z.enum(['salary', 'business', 'investment', 'savings', 'other']),
  sourceOfFundsNote: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();
  const profile = await kycService.getProfile(session.sub);
  return ok(profile);
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();

  try {
    const body = await req.json();
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) return validationError('Validation failed', parsed.error.flatten());

    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    const profile = await kycService.submitProfile(session.sub, {
      ...parsed.data,
      dateOfBirth: new Date(parsed.data.dateOfBirth),
    }, ip);

    return ok(profile);
  } catch {
    return serverError();
  }
}
