import { NextRequest } from 'next/server';
import { getSessionFromRequest, isAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ok, unauthorized, forbidden } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const sp = req.nextUrl.searchParams;
  const actorUserId = sp.get('actorUserId') ?? undefined;
  const subjectUserId = sp.get('subjectUserId') ?? undefined;
  const action = sp.get('action') ?? undefined;
  const entityType = sp.get('entityType') ?? undefined;
  const orderId = sp.get('orderId') ?? undefined;
  const from = sp.get('from');
  const to = sp.get('to');
  const page = parseInt(sp.get('page') ?? '1', 10);
  const limit = Math.min(parseInt(sp.get('limit') ?? '50', 10), 200);

  const where = {
    ...(actorUserId && { actorUserId }),
    ...(subjectUserId && { subjectUserId }),
    ...(action && { action: { contains: action } }),
    ...(entityType && { entityType }),
    ...(orderId && { orderId }),
    ...((from || to) && {
      createdAt: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    }),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        actorUser: { select: { fullName: true, email: true } },
        subjectUser: { select: { fullName: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return ok({ logs, total, page, limit, pages: Math.ceil(total / limit) });
}
