import { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { ordersService } from '@/lib/services/orders.service';
import { ok, unauthorized, notFound, err, serverError } from '@/lib/api-response';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();

  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';

  try {
    const result = await ordersService.submit(params.id, session.sub, ip);
    if (!result.passed) {
      return err('Order failed compliance checks and has been rejected', 422, {
        failures: result.failures,
        order: result.order,
      });
    }
    return ok(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'ORDER_NOT_FOUND') return notFound('Order not found');
    if (msg === 'ORDER_NOT_DRAFT') return err('Order has already been submitted', 409);
    return serverError();
  }
}
