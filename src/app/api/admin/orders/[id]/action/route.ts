import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSessionFromRequest, isComplianceOrAdmin, isFinanceOrAdmin } from '@/lib/auth';
import { ordersService } from '@/lib/services/orders.service';
import { ok, unauthorized, forbidden, notFound, err, validationError, serverError } from '@/lib/api-response';

const schema = z.object({
  action: z.enum(['approve', 'reject', 'hold', 'request_documents', 'mark_payment_received', 'mark_crypto_sent', 'complete']),
  notes: z.string().max(2000).optional(),
  rejectionReason: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();
  if (!isComplianceOrAdmin(session) && !isFinanceOrAdmin(session)) return forbidden();

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationError('Invalid action', parsed.error.flatten());

    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    const order = await ordersService.adminAction(params.id, parsed.data, session.sub, ip);
    return ok(order);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'ORDER_NOT_FOUND') return notFound();
    if (msg === 'INVALID_ACTION') return err('Invalid action for current order status', 409);
    if (msg === 'ORDER_NOT_AWAITING_PAYMENT') return err('Order is not in awaiting_payment status', 409);
    return serverError();
  }
}
