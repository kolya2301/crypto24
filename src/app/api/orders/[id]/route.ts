import { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { ordersService } from '@/lib/services/orders.service';
import { ok, unauthorized, notFound, err, serverError } from '@/lib/api-response';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();
  try {
    const order = await ordersService.getById(params.id, session.sub);
    return ok(order);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'ORDER_NOT_FOUND') return notFound('Order not found');
    return serverError();
  }
}
