import { NextRequest } from 'next/server';
import { z } from 'zod';
import { phoneAuthService } from '@/lib/services/phone-auth.service';
import { ok, err, serverError, rateLimited } from '@/lib/api-response';

const schema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Phone must be in E.164 format, e.g. +972501234567'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err('Invalid input', 422);

    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';

    await phoneAuthService.requestOtp(parsed.data.phone, ip);

    return ok({ sent: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'RATE_LIMITED') return rateLimited();
    if (msg === 'SMSTO_NOT_CONFIGURED') return serverError('SMS provider is not configured');
    return serverError();
  }
}
