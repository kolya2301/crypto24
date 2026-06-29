import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ok, err, unauthorized, validationError, serverError } from '@/lib/api-response';
import { PLACEHOLDER_EMAIL_DOMAIN } from '@/lib/services/phone-auth.service';

const schema = z.object({
  phone: z.string().min(6).max(20).optional(),
  email: z.string().email().refine(v => !v.toLowerCase().endsWith(PLACEHOLDER_EMAIL_DOMAIN), 'Invalid email').optional(),
  fullName: z.string().min(2).max(120).optional(),
  residencyCountry: z.string().min(2).max(2).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationError('Validation failed', parsed.error.flatten());

    if (parsed.data.email) {
      const existing = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
      if (existing && existing.id !== session.sub) return err('Email is already registered', 409);
    }

    const current = await prisma.user.findUniqueOrThrow({ where: { id: session.sub }, select: { phone: true } });
    const phoneChanged = !!parsed.data.phone && parsed.data.phone !== current.phone;

    if (phoneChanged) {
      const existingPhone = await prisma.user.findFirst({ where: { phone: parsed.data.phone } });
      if (existingPhone && existingPhone.id !== session.sub) return err('Phone number is already registered', 409);
    }

    const user = await prisma.user.update({
      where: { id: session.sub },
      data: {
        ...(parsed.data.phone && { phone: parsed.data.phone, ...(phoneChanged && { isPhoneVerified: false }) }),
        ...(parsed.data.email && { email: parsed.data.email.toLowerCase().trim(), isEmailVerified: false }),
        ...(parsed.data.fullName && { fullName: parsed.data.fullName }),
        ...(parsed.data.residencyCountry && { residencyCountry: parsed.data.residencyCountry }),
      },
      select: { id: true, email: true, fullName: true, phone: true, residencyCountry: true, status: true },
    });

    return ok({ user });
  } catch {
    return serverError();
  }
}
