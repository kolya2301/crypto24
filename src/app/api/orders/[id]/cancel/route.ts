import { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { ordersService } from '@/lib/services/orders.service';
import { ok, unauthorized, notFound, err, serverError } from '@/lib/api-response';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  try {
    const order = await ordersService.cancel(params.id, session.sub, ip);
    return ok(order);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'ORDER_NOT_FOUND') return notFound();
    if (msg === 'ORDER_NOT_CANCELLABLE') return err('Order cannot be cancelled in its current status', 409);
    return serverError();
  }
}
