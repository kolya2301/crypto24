import { NextRequest } from 'next/server';
import { getSessionFromRequest, isFinanceOrAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ok, unauthorized, created, serverError } from '@/lib/api-response';

// GET /api/crm/deals — deal pipeline (kanban data)
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || !isFinanceOrAdmin(session)) return unauthorized();

  const { searchParams } = req.nextUrl;
  const stage = searchParams.get('stage') ?? undefined;
  const assignedTo = searchParams.get('assignedTo') ?? undefined;
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = 50;

  const deals = await prisma.crmDeal.findMany({
    where: {
      ...(stage ? { stage: stage as never } : {}),
      ...(assignedTo ? { assignedTo } : {}),
    },
    include: {
      client: {
        include: { user: { select: { email: true, fullName: true, phone: true } } },
      },
      activities: { orderBy: { createdAt: 'desc' }, take: 3 },
    },
    orderBy: { updatedAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  // Group by stage for kanban view
  const stages = ['new', 'contacted', 'quote_sent', 'negotiating', 'kyc_pending', 'payment_pending', 'completed', 'lost'];
  const kanban = Object.fromEntries(
    stages.map(s => [s, deals.filter(d => d.stage === s)]),
  );

  return ok({ deals, kanban });
}

// POST /api/crm/deals — create new deal
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || !isFinanceOrAdmin(session)) return unauthorized();

  try {
    const body = await req.json();
    const { clientId, title, stage, asset, direction, estimatedAmount, currency, notes, orderId, expectedCloseDate } = body;

    // Ensure client exists
    const client = await prisma.crmClient.findUnique({ where: { id: clientId } });
    if (!client) return ok({ error: 'Client not found' });

    const deal = await prisma.crmDeal.create({
      data: {
        clientId,
        title,
        stage: stage ?? 'new',
        asset,
        direction,
        estimatedAmount: estimatedAmount ? parseFloat(estimatedAmount) : undefined,
        currency: currency ?? 'ILS',
        notes,
        orderId,
        assignedTo: session.sub,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : undefined,
      },
    });

    // Log activity
    await prisma.crmActivity.create({
      data: {
        clientId,
        dealId: deal.id,
        actorId: session.sub,
        type: 'note',
        title: `עסקה חדשה נוצרה: ${title}`,
        isAuto: true,
      },
    });

    return created(deal);
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
