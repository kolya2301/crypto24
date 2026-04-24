import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { audit, auditActions } from '@/lib/audit';

/**
 * Bit Business webhook handler.
 *
 * Bit sends a POST to this endpoint when payment status changes.
 * Signature: HMAC-SHA256 of the raw body using BIT_SECRET, sent in X-Bit-Signature header.
 *
 * This endpoint ONLY records the event — it does NOT auto-complete orders.
 * Finance operator must confirm receipt in the admin panel.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-bit-signature') ?? '';

  const secret = process.env.BIT_SECRET;
  if (secret) {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      console.warn('[Webhook/Bit] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else {
    console.warn('[Webhook/Bit] BIT_SECRET not set — skipping signature verification');
  }

  let payload: {
    payment_id: string;
    order_id: string;
    status: string;   // 'completed' | 'failed' | 'expired' | 'cancelled'
    amount_agorot: number;
    completed_at?: string;
    sender_phone?: string;
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { payment_id, order_id, status, amount_agorot, completed_at } = payload;

  if (!payment_id || !order_id || !status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const paymentRecord = await prisma.paymentRecord.findFirst({
    where: { providerReference: payment_id, orderId: order_id },
  });

  if (!paymentRecord) {
    console.warn('[Webhook/Bit] No payment record found', { payment_id, order_id });
    return NextResponse.json({ received: true });
  }

  const statusMap: Record<string, string> = {
    completed: 'confirmed',
    failed: 'failed',
    expired: 'failed',
    cancelled: 'failed',
  };

  const newStatus = statusMap[status] ?? 'pending';
  const amountIls = amount_agorot / 100;

  await prisma.paymentRecord.update({
    where: { id: paymentRecord.id },
    data: {
      status: newStatus as 'pending' | 'confirmed' | 'failed' | 'refunded',
      confirmedAt: completed_at ? new Date(completed_at) : (status === 'completed' ? new Date() : undefined),
      notes: `Bit webhook: ${status} (payment_id: ${payment_id})`,
    },
  });

  await audit({
    entityType: 'order',
    entityId: order_id,
    orderId: order_id,
    action: auditActions.PAYMENT_INITIATED,
    description: `Bit webhook received: ${status} — payment_id: ${payment_id}, amount: ${amountIls} ILS`,
    afterJson: { payment_id, status, amount_agorot, completed_at },
  });

  if (status === 'completed') {
    const order = await prisma.order.findUnique({ where: { id: order_id } });
    if (order) {
      await prisma.notification.create({
        data: {
          userId: order.userId,
          orderId: order_id,
          type: 'payment_received',
          titleHe: 'תשלום התקבל דרך ביט',
          titleRu: 'Оплата получена через Bit',
          bodyHe: `תשלום של ${amountIls} ₪ התקבל דרך ביט. המתן לאישור הצוות.`,
          bodyRu: `Оплата ${amountIls} ₪ получена через Bit. Ожидайте подтверждения команды.`,
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
