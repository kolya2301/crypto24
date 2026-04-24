import { NextRequest } from 'next/server';
import { getSessionFromRequest, isFinanceOrAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ok, unauthorized } from '@/lib/api-response';

// GET /api/crm/clients — list all CRM clients with user info
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || !isFinanceOrAdmin(session)) return unauthorized();

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status') ?? undefined;
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = 30;
  const skip = (page - 1) * limit;

  const [clients, total] = await Promise.all([
    prisma.crmClient.findMany({
      where: status ? { status: status as never } : undefined,
      include: {
        user: { select: { email: true, fullName: true, phone: true, createdAt: true } },
        deals: { select: { id: true, stage: true }, take: 5 },
        _count: { select: { activities: true } },
      },
      orderBy: { totalVolume: 'desc' },
      skip,
      take: limit,
    }),
    prisma.crmClient.count({ where: status ? { status: status as never } : undefined }),
  ]);

  return ok({ clients, total, page, pages: Math.ceil(total / limit) });
}

// POST /api/crm/clients — manually create a CRM client record for existing user
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || !isFinanceOrAdmin(session)) return unauthorized();

  const body = await req.json();
  const { userId, status, tags, internalNotes, assignedTo } = body;

  const existing = await prisma.crmClient.findUnique({ where: { userId } });
  if (existing) {
    const updated = await prisma.crmClient.update({
      where: { userId },
      data: { status: status ?? existing.status, tags, internalNotes, assignedTo },
    });
    return ok(updated);
  }

  const client = await prisma.crmClient.create({
    data: { userId, status: status ?? 'lead', tags, internalNotes, assignedTo },
  });
  return ok(client);
}
