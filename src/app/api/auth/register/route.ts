import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authService } from '@/lib/services/auth.service';
import { ok, created, err, validationError, serverError } from '@/lib/api-response';
import { makeSessionCookie } from '@/lib/auth';
import { cookies } from 'next/headers';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/, 'Must contain uppercase').regex(/[0-9]/, 'Must contain number'),
  phone: z.string().min(9).max(20),
  fullName: z.string().min(2).max(120),
  residencyCountry: z.string().length(2).default('IL'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationError('Validation failed', parsed.error.flatten());

    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
    const userAgent = req.headers.get('user-agent') ?? '';

    const result = await authService.register(parsed.data, ip, userAgent);

    const cookie = makeSessionCookie(result.token);
    const cookieStore = await cookies();
    cookieStore.set(cookie.name, cookie.value, cookie.options as Parameters<typeof cookieStore.set>[2]);

    return created({ user: result.user });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'EMAIL_EXISTS') return err('Email is already registered', 409);
    return serverError();
  }
}
