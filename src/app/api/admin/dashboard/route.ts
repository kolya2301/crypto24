import { NextRequest } from 'next/server';
import { getSessionFromRequest, isComplianceOrAdmin, isFinanceOrAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ok, unauthorized, forbidden } from '@/lib/api-response';
import { OrderStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();
  if (!isComplianceOrAdmin(session) && !isFinanceOrAdmin(session)) return forbidden();

  const [
    ordersByStatus,
    usersByKyc,
    pendingCompliance,
    recentOrders,
    totalVolume,
  ] = await Promise.all([
    prisma.order.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.kycProfile.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.order.count({ where: { status: OrderStatus.pending_review } }),
    prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      where: { status: { not: OrderStatus.draft } },
      include: { user: { select: { fullName: true, email: true } } },
    }),
    prisma.order.aggregate({
      where: { status: OrderStatus.completed },
      _sum: { fiatAmount: true },
    }),
  ]);

  return ok({
    ordersByStatus,
    usersByKyc,
    pendingCompliance,
    recentOrders,
    totalCompletedVolumeIls: totalVolume._sum.fiatAmount ?? 0,
  });
}
