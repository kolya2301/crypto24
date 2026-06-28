import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ok, unauthorized, validationError, serverError } from '@/lib/api-response';

const schema = z.object({
  phone: z.string().min(6).max(20),
  residencyCountry: z.string().min(2).max(2),
});

export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationError('Validation failed', parsed.error.flatten());

    const user = await prisma.user.update({
      where: { id: session.sub },
      data: { phone: parsed.data.phone, residencyCountry: parsed.data.residencyCountry },
      select: { id: true, email: true, fullName: true, phone: true, residencyCountry: true, status: true },
    });

    return ok({ user });
  } catch {
    return serverError();
  }
}
