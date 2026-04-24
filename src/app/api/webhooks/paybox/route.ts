import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { audit, auditActions } from '@/lib/audit';

/**
 * PayBox webhook handler.
 *
 * PayBox sends a POST to this endpoint when a payment status changes.
 * The signature is HMAC-SHA256 of the raw body using PAYBOX_SECRET.
 *
 * This endpoint ONLY records the event — it does NOT auto-complete orders.
 * A finance operator must manually mark the payment as confirmed in the admin panel.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-paybox-signature') ?? '';

  // Verify HMAC signature
  const secret = process.env.PAYBOX_SECRET;
  if (secret) {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      console.warn('[Webhook/PayBox] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else {
    console.warn('[Webhook/PayBox] PAYBOX_SECRET not set — skipping signature verification');
  }

  let payload: {
    payment_id: string;
    order_id: string;
    status: string;  // 'completed' | 'failed' | 'refunded' | 'expired'
    amount: number;  // in agorot
    currency: string;
    confirmed_at?: string;
    customer_email?: string;
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { payment_id, order_id, status, amount, currency, confirmed_at } = payload;

  if (!payment_id || !order_id || !status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Find the matching payment record by provider reference
  const paymentRecord = await prisma.paymentRecord.findFirst({
    where: { providerReference: payment_id, orderId: order_id },
  });

  if (!paymentRecord) {
    // Could be a replay or test webhook — log and return 200 to stop retries
    console.warn('[Webhook/PayBox] No payment record found', { payment_id, order_id });
    return NextResponse.json({ received: true });
  }

  const statusMap: Record<string, string> = {
    completed: 'confirmed',
    failed: 'failed',
    refunded: 'refunded',
    expired: 'failed',
  };

  const newStatus = statusMap[status] ?? 'pending';

  await prisma.paymentRecord.update({
    where: { id: paymentRecord.id },
    data: {
      status: newStatus as 'pending' | 'confirmed' | 'failed' | 'refunded',
      confirmedAt: confirmed_at ? new Date(confirmed_at) : (status === 'completed' ? new Date() : undefined),
      notes: `PayBox webhook: ${status} (payment_id: ${payment_id})`,
    },
  });

  // Log the webhook event — finance operator will review and act
  await audit({
    entityType: 'order',
    entityId: order_id,
    orderId: order_id,
    action: auditActions.PAYMENT_INITIATED,
    description: `PayBox webhook received: ${status} — payment_id: ${payment_id}, amount: ${amount / 100} ${currency}`,
    afterJson: { payment_id, status, amount, currency, confirmed_at },
  });

  // Create in-app notification for finance operators if payment is confirmed
  if (status === 'completed') {
    const order = await prisma.order.findUnique({ where: { id: order_id } });
    if (order) {
      await prisma.notification.create({
        data: {
          userId: order.userId,
          orderId: order_id,
          type: 'payment_received',
          titleHe: 'תשלום התקבל דרך פייבוקס',
          titleRu: 'Оплата получена через PayBox',
          bodyHe: `תשלום של ${amount / 100} ${currency} התקבל דרך פייבוקס. המתן לאישור הצוות.`,
          bodyRu: `Оплата ${amount / 100} ${currency} получена через PayBox. Ожидайте подтверждения команды.`,
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
