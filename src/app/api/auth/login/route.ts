import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authService } from '@/lib/services/auth.service';
import { ok, err, serverError, rateLimited } from '@/lib/api-response';
import { makeSessionCookie } from '@/lib/auth';
import { cookies } from 'next/headers';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err('Invalid input', 422);

    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    const userAgent = req.headers.get('user-agent') ?? '';

    const result = await authService.login(parsed.data.email, parsed.data.password, ip, userAgent);

    const cookie = makeSessionCookie(result.token);
    const cookieStore = await cookies();
    cookieStore.set(cookie.name, cookie.value, cookie.options as Parameters<typeof cookieStore.set>[2]);

    return ok({ user: result.user });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'RATE_LIMITED') return rateLimited();
    if (msg === 'ACCOUNT_DISABLED') return err('Account is suspended or deactivated', 403);
    if (msg === 'INVALID_CREDENTIALS') return err('Invalid email or password', 401);
    return serverError();
  }
}
