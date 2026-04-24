import { NextRequest } from 'next/server';
import { getSessionFromRequest, isFinanceOrAdmin } from '@/lib/auth';
import { ok, unauthorized, err, serverError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { audit, auditActions } from '@/lib/audit';

/**
 * uPay Israel — manual payment link creation.
 *
 * uPay does NOT provide a public REST API.
 * They only provide WooCommerce / plugins integration.
 *
 * This endpoint creates a payment record in our system and provides
 * a manual workflow for the finance operator:
 *   1. Operator receives customer card details via secure form
 *   2. Operator logs into uPay dashboard and creates the charge
 *   3. Operator marks order as paid in our system
 *
 * Future: if uPay provides API access, implement real HTTP calls here.
 *
 * ENV required:
 *   UPAY_TERMINAL_ID     — terminal number from uPay merchant dashboard
 *   UPAY_USERNAME        — operator username
 *   UPAY_PASSWORD        — operator password
 *   UPAY_ENABLED=true
 */

const UPAY_TERMINAL_ID = process.env.UPAY_TERMINAL_ID ?? '';
const UPAY_ENABLED = process.env.UPAY_ENABLED === 'true';

// POST /api/payments/upay — create uPay payment record for manual processing
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || !isFinanceOrAdmin(session)) return unauthorized();

  if (!UPAY_ENABLED) {
    return err('uPay is not enabled. Set UPAY_ENABLED=true and UPAY_TERMINAL_ID in .env', 503);
  }

  const body = await req.json();
  const { orderId, customerName, customerPhone, amountIls, last4, notes } = body;

  if (!orderId || !amountIls) {
    return err('orderId and amountIls are required', 400);
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return err('Order not found', 404);

  // Create payment record
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';

  try {
    const paymentRecord = await prisma.paymentRecord.create({
      data: {
        orderId,
        method: 'PAYBOX', // closest available enum — uPay is a credit card processor
        provider: 'upay',
        providerReference: `UPAY-${UPAY_TERMINAL_ID}-${Date.now()}`,
        amount: amountIls,
        currency: 'ILS',
        status: 'pending',
        notes: [
          `uPay Manual Charge`,
          `Customer: ${customerName ?? 'N/A'}`,
          `Phone: ${customerPhone ?? 'N/A'}`,
          `Card last 4: ${last4 ?? 'N/A'}`,
          `Notes: ${notes ?? '—'}`,
          `Terminal: ${UPAY_TERMINAL_ID}`,
          `Created by: ${session.email}`,
        ].join('\n'),
      },
    });

    await audit({
      actorUserId: session.sub,
      actorRole: session.role,
      entityType: 'order',
      entityId: orderId,
      orderId,
      action: auditActions.PAYMENT_INITIATED,
      description: `uPay manual payment initiated — ₪${amountIls} | last4: ${last4 ?? 'N/A'}`,
      afterJson: { provider: 'upay', amount: amountIls, customerPhone, last4 },
      ipAddress: ip,
    });

    return ok({
      paymentRecord,
      instructions: {
        he: [
          `✅ רשומת התשלום נוצרה בהצלחה`,
          ``,
          `📋 הוראות לאופרטור:`,
          `1. כנסו לדשבורד uPay: https://www.u-pay.co.il`,
          `2. מספר מסוף: ${UPAY_TERMINAL_ID}`,
          `3. צרו חיוב ידני על סכום: ₪${amountIls}`,
          `4. הזינו פרטי כרטיס שהתקבלו מהלקוח`,
          `5. לאחר אישור — סמנו את ההזמנה כ"תשלום התקבל" במערכת`,
        ].join('\n'),
        ru: [
          `✅ Запись платежа создана`,
          ``,
          `📋 Инструкции для оператора:`,
          `1. Войдите в дашборд uPay: https://www.u-pay.co.il`,
          `2. Номер терминала: ${UPAY_TERMINAL_ID}`,
          `3. Создайте ручной платёж на сумму: ₪${amountIls}`,
          `4. Введите данные карты клиента`,
          `5. После подтверждения — отметьте заявку как "Оплата получена"`,
        ].join('\n'),
      },
    });
  } catch (e) {
    console.error('[uPay] Error creating payment record:', e);
    return serverError();
  }
}
