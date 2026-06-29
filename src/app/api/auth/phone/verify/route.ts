import { NextRequest } from 'next/server';
import { z } from 'zod';
import { phoneAuthService } from '@/lib/services/phone-auth.service';
import { ok, err, serverError, rateLimited } from '@/lib/api-response';
import { makeSessionCookie } from '@/lib/auth';
import { cookies } from 'next/headers';

const schema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err('Invalid input', 422);

    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
    const userAgent = req.headers.get('user-agent') ?? '';

    const result = await phoneAuthService.verifyOtp(parsed.data.phone, parsed.data.code, ip, userAgent);

    const cookie = makeSessionCookie(result.token);
    const cookieStore = await cookies();
    cookieStore.set(cookie.name, cookie.value, cookie.options as Parameters<typeof cookieStore.set>[2]);

    return ok({ user: result.user, needsProfileCompletion: result.needsProfileCompletion });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'RATE_LIMITED') return rateLimited();
    if (msg === 'OTP_EXPIRED') return err('Code expired, request a new one', 410);
    if (msg === 'OTP_INVALID') return err('Invalid code', 401);
    if (msg === 'OTP_TOO_MANY_ATTEMPTS') return err('Too many attempts, request a new code', 429);
    if (msg === 'ACCOUNT_DISABLED') return err('Account is suspended or deactivated', 403);
    return serverError();
  }
}
