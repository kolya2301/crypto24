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
 * BIT Business API integration (Bank Hapoalim's Israeli payment platform).
 *
 * Credentials required in .env:
 *   BIT_MERCHANT_ID      — merchant ID from Bit Business partner program
 *   BIT_API_KEY          — API key issued after Bit Business onboarding
 *   BIT_SECRET           — webhook signing secret
 *   BIT_API_URL          — override for staging
 *   PAYMENT_BIT_ENABLED=true
 *
 * Bit Business onboarding: https://business.bit.co.il/
 * API docs are provided only to approved partners.
 *
 * Amounts are in AGOROT (1 ILS = 100 agorot).
 */
const BASE_URL = process.env.BIT_API_URL ?? 'https://api.bit.co.il';
const MERCHANT_ID = process.env.BIT_MERCHANT_ID ?? '';
const API_KEY = process.env.BIT_API_KEY ?? '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export class BitProvider implements IPaymentProvider {
  readonly methodType = 'BIT';
  readonly displayNameHe = 'ביט';
  readonly displayNameRu = 'Bit';

  isAvailable(): boolean {
    return (
      process.env.PAYMENT_BIT_ENABLED === 'true' &&
      !!MERCHANT_ID &&
      !!API_KEY
    );
  }

  getLimits(): PaymentLimits {
    return {
      minAmountIls: 200,
      maxAmountIls: 20000,
      supportedCurrencies: ['ILS'],
      supportedDirections: ['buy', 'sell'],
    };
  }

  getComplianceNotes(_order: Order, _user: User): ComplianceNotes {
    const isStub = !this.isAvailable();
    return {
      notes: [
        'Bit payments require an approved Bit Business partner account',
        'Payment receipt must be confirmed manually by a finance operator',
        'Bit only supports ILS currency',
      ],
      warnings: isStub
        ? ['Bit Business credentials not configured — running in stub mode']
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

    const amountAgorot = Math.round(Number(request.amount) * 100);

    const body = {
      merchant_id: MERCHANT_ID,
      api_key: API_KEY,
      amount_agorot: amountAgorot,
      description: `crypto24 — ${order.type} ${order.asset}`,
      reference: request.reference,
      order_id: request.orderId,
      callback_url: `${APP_URL}/api/webhooks/bit`,
      success_url: `${APP_URL}/he/orders/${request.orderId}?payment=success`,
      cancel_url: `${APP_URL}/he/orders/${request.orderId}?payment=cancelled`,
      expiry_seconds: request.expiresAt
        ? Math.floor((request.expiresAt.getTime() - Date.now()) / 1000)
        : 86400,
      customer_phone: user.phone ?? undefined,
    };

    const res = await fetch(`${BASE_URL}/v2/payment/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[BitProvider] API error', res.status, text);
      throw new Error(`BIT_API_ERROR:${res.status}`);
    }

    const data = (await res.json()) as {
      payment_id: string;
      payment_url: string;
      deep_link: string;  // bit://pay?...  — opens Bit app directly
      expires_at: string;
      error?: string;
    };

    if (!data.payment_id) {
      throw new Error(`BIT_REJECTED:${data.error ?? 'unknown'}`);
    }

    return {
      success: true,
      providerReference: data.payment_id,
      paymentUrl: data.payment_url,
      instructions: `לתשלום דרך ביט לחץ על הקישור: ${data.payment_url}`,
      instructionsRu: `Для оплаты через Bit перейдите по ссылке: ${data.payment_url}`,
      expiresAt: new Date(data.expires_at),
      providerData: {
        payment_id: data.payment_id,
        payment_url: data.payment_url,
        deep_link: data.deep_link,
      },
      isStub: false,
    };
  }

  async verifyPaymentStatus(order: Order): Promise<PaymentStatusResult> {
    if (!this.isAvailable()) {
      return { status: 'pending', providerReference: '', isStub: true };
    }

    const paymentId = (order as Order & { _providerRef?: string })._providerRef;
    if (!paymentId) {
      return { status: 'pending', providerReference: '', isStub: false };
    }

    const res = await fetch(`${BASE_URL}/v2/payment/${paymentId}`, {
      headers: {
        'X-Merchant-ID': MERCHANT_ID,
        'X-API-Key': API_KEY,
      },
    });

    if (!res.ok) {
      console.error('[BitProvider] Status check failed', res.status);
      return { status: 'pending', providerReference: paymentId, isStub: false };
    }

    const data = (await res.json()) as {
      payment_id: string;
      status: string;  // 'pending' | 'completed' | 'failed' | 'expired' | 'cancelled'
      amount_agorot: number;
      completed_at?: string;
    };

    const statusMap: Record<string, PaymentStatusResult['status']> = {
      completed: 'received',
      pending: 'pending',
      failed: 'failed',
      expired: 'expired',
      cancelled: 'failed',
    };

    return {
      status: statusMap[data.status] ?? 'pending',
      providerReference: data.payment_id,
      amount: data.amount_agorot / 100,
      confirmedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      isStub: false,
    };
  }

  private stubResult(request: PaymentRequest): PaymentRequestResult {
    console.warn('[BitProvider] STUB — set BIT_MERCHANT_ID and BIT_API_KEY to enable real payments');
    return {
      success: true,
      providerReference: `BIT-STUB-${request.reference}`,
      instructions: `[STUB] שלח ${request.amount} ₪ דרך ביט. הצוות שלנו יאשר את הקבלה.`,
      instructionsRu: `[STUB] Переведите ${request.amount} ₪ через Bit. Наша команда подтвердит получение.`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      providerData: { stub: true },
      isStub: true,
    };
  }
}
