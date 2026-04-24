import { NextRequest } from 'next/server';
import { getSessionFromRequest, isComplianceOrAdmin, isFinanceOrAdmin } from '@/lib/auth';
import { ordersService } from '@/lib/services/orders.service';
import { ok, unauthorized, forbidden, serverError } from '@/lib/api-response';
import { CryptoCurrency, OrderStatus, OrderType } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();
  if (!isComplianceOrAdmin(session) && !isFinanceOrAdmin(session)) return forbidden();

  const sp = req.nextUrl.searchParams;
  const result = await ordersService.adminList({
    status: sp.get('status') as OrderStatus | undefined,
    userId: sp.get('userId') ?? undefined,
    type: sp.get('type') as OrderType | undefined,
    asset: sp.get('asset') as CryptoCurrency | undefined,
    page: parseInt(sp.get('page') ?? '1', 10),
    limit: Math.min(parseInt(sp.get('limit') ?? '50', 10), 200),
  });
  return ok(result);
}
