import { Order, User } from '@prisma/client';
import {
  IPaymentProvider,
  PaymentLimits,
  PaymentRequest,
  PaymentRequestResult,
  PaymentStatusResult,
  ComplianceNotes,
} from './payment-provider.interface';

/**
 * PayBox Business API integration (Israeli payment platform).
 *
 * Credentials required in .env:
 *   PAYBOX_MERCHANT_ID   — merchant ID from PayBox Business dashboard
 *   PAYBOX_API_KEY       — API key from PayBox Business dashboard
 *   PAYBOX_SECRET        — webhook signing secret (for HMAC verification)
 *   PAYBOX_API_URL       — override for staging: https://sandbox.payboxpay.com
 *   PAYMENT_PAYBOX_ENABLED=true
 *
 * PayBox Business API docs: https://docs.payboxpay.com/business
 */
const BASE_URL = process.env.PAYBOX_API_URL ?? 'https://api.payboxpay.com';
const MERCHANT_ID = process.env.PAYBOX_MERCHANT_ID ?? '';
const API_KEY = process.env.PAYBOX_API_KEY ?? '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export class PayBoxProvider implements IPaymentProvider {
  readonly methodType = 'PAYBOX';
  readonly displayNameHe = 'פייבוקס';
  readonly displayNameRu = 'PayBox';

  isAvailable(): boolean {
    return (
      process.env.PAYMENT_PAYBOX_ENABLED === 'true' &&
      !!MERCHANT_ID &&
      !!API_KEY
    );
  }

  getLimits(): PaymentLimits {
    return {
      minAmountIls: 200,
      maxAmountIls: 50000,
      supportedCurrencies: ['ILS', 'USD', 'EUR'],
      supportedDirections: ['buy', 'sell'],
    };
  }

  getComplianceNotes(_order: Order, _user: User): ComplianceNotes {
    const isStub = !this.isAvailable();
    return {
      notes: [
        'PayBox payments require an approved business merchant account',
        'Payment receipt must be confirmed manually by a finance operator',
        'PayBox may impose additional limits based on transaction volume',
      ],
      warnings: isStub
        ? ['PayBox merchant credentials not configured — running in stub mode']
        : [],
      requiresManualConfirmation: true,
    };
  }

  async createPaymentRequest(
    request: PaymentRequest,
    order: Order,
    user: User,
  ): Promise<PaymentRequestResult> {
    if (!this.isAvailable()) {
      return this.stubResult(request);
    }

    const body = {
      merchant_id: MERCHANT_ID,
      api_key: API_KEY,
      amount: Math.round(Number(request.amount) * 100), // agorot / cents
      currency: request.currency,
      description: `crypto24 — ${order.type} ${order.asset}`,
      order_id: request.orderId,
      reference: request.reference,
      success_url: `${APP_URL}/he/orders/${request.orderId}?payment=success`,
      cancel_url: `${APP_URL}/he/orders/${request.orderId}?payment=cancelled`,
      notify_url: `${APP_URL}/api/webhooks/paybox`,
      expiry: request.expiresAt
        ? Math.floor((request.expiresAt.getTime() - Date.now()) / 1000)
        : 86400,
      customer: {
        name: user.fullName ?? '',
        email: user.email,
        phone: user.phone ?? '',
      },
    };

    const res = await fetch(`${BASE_URL}/v1/payment/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[PayBoxProvider] API error', res.status, text);
      throw new Error(`PAYBOX_API_ERROR:${res.status}`);
    }

    const data = (await res.json()) as {
      success: boolean;
      payment_id: string;
      checkout_url: string;
      expires_at: string;
      error?: string;
    };

    if (!data.success) {
      throw new Error(`PAYBOX_REJECTED:${data.error ?? 'unknown'}`);
    }

    return {
      success: true,
      providerReference: data.payment_id,
      paymentUrl: data.checkout_url,
      instructions: `לתשלום דרך פייבוקס לחץ על הקישור: ${data.checkout_url}`,
      instructionsRu: `Для оплаты через PayBox перейдите по ссылке: ${data.checkout_url}`,
      expiresAt: new Date(data.expires_at),
      providerData: { payment_id: data.payment_id, checkout_url: data.checkout_url },
      isStub: false,
    };
  }

  async verifyPaymentStatus(order: Order): Promise<PaymentStatusResult> {
    if (!this.isAvailable()) {
      return { status: 'pending', providerReference: '', isStub: true };
    }

    // Find the provider reference from payment records (passed via order context)
    // In production: GET /v1/payment/{payment_id}/status
    const paymentId = (order as Order & { _providerRef?: string })._providerRef;
    if (!paymentId) {
      return { status: 'pending', providerReference: '', isStub: false };
    }

    const res = await fetch(`${BASE_URL}/v1/payment/${paymentId}/status`, {
      headers: {
        'X-Merchant-ID': MERCHANT_ID,
        'X-API-Key': API_KEY,
      },
    });

    if (!res.ok) {
      console.error('[PayBoxProvider] Status check failed', res.status);
      return { status: 'pending', providerReference: paymentId, isStub: false };
    }

    const data = (await res.json()) as {
      payment_id: string;
      status: string;
      amount: number;
      confirmed_at?: string;
    };

    const statusMap: Record<string, PaymentStatusResult['status']> = {
      completed: 'received',
      pending: 'pending',
      failed: 'failed',
      expired: 'expired',
      refunded: 'refunded',
    };

    return {
      status: statusMap[data.status] ?? 'pending',
      providerReference: data.payment_id,
      amount: data.amount / 100,
      confirmedAt: data.confirmed_at ? new Date(data.confirmed_at) : undefined,
      isStub: false,
    };
  }

  /** Returns a stub result when credentials are not configured */
  private stubResult(request: PaymentRequest): PaymentRequestResult {
    console.warn('[PayBoxProvider] STUB — set PAYBOX_MERCHANT_ID and PAYBOX_API_KEY to enable real payments');
    return {
      success: true,
      providerReference: `PB-STUB-${request.reference}`,
      instructions: `[STUB] שלם ${request.amount} ${request.currency} דרך פייבוקס. הצוות שלנו יאשר את הקבלה.`,
      instructionsRu: `[STUB] Оплатите ${request.amount} ${request.currency} через PayBox. Наша команда подтвердит получение.`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      providerData: { stub: true },
      isStub: true,
    };
  }
}
