import { Order, User } from '@prisma/client';

export interface PaymentLimits {
  minAmountIls: number;
  maxAmountIls: number;
  supportedCurrencies: string[];
  supportedDirections: ('buy' | 'sell')[];
}

export interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  reference: string;
  callbackUrl?: string;
  expiresAt?: Date;
}

export interface PaymentRequestResult {
  success: boolean;
  providerReference: string;
  paymentUrl?: string;       // Deep link or redirect URL
  instructions: string;      // Human-readable (in Hebrew by default)
  instructionsRu?: string;
  expiresAt?: Date;
  providerData?: Record<string, unknown>;
  isStub: boolean;           // Must be true until real integration is active
}

export interface PaymentStatusResult {
  status: 'pending' | 'received' | 'failed' | 'expired' | 'refunded';
  providerReference: string;
  amount?: number;
  confirmedAt?: Date;
  providerData?: Record<string, unknown>;
  isStub: boolean;
}

export interface ComplianceNotes {
  notes: string[];
  warnings: string[];
  requiresManualConfirmation: boolean;
}

/**
 * IPaymentProvider — abstraction for all payment methods.
 *
 * Every provider MUST implement this interface.
 * New providers (e.g. Pango, bank transfer) can be added without touching order logic.
 *
 * IMPORTANT: No provider should ever auto-complete an order.
 * Payment confirmation always requires admin/finance operator review.
 */
export interface IPaymentProvider {
  readonly methodType: string;
  readonly displayNameHe: string;
  readonly displayNameRu: string;

  /** Is this provider currently configured and operational? */
  isAvailable(): boolean;

  /** Provider-level usage limits */
  getLimits(): PaymentLimits;

  /** Compliance notes specific to this payment method */
  getComplianceNotes(order: Order, user: User): ComplianceNotes;

  /**
   * Initiate a payment request.
   * Returns instructions/URL — does NOT mark order as paid.
   * Payment receipt must be confirmed by finance operator.
   */
  createPaymentRequest(request: PaymentRequest, order: Order, user: User): Promise<PaymentRequestResult>;

  /**
   * Query payment status from provider.
   * Result is informational only — order status must be updated by operator.
   */
  verifyPaymentStatus(order: Order): Promise<PaymentStatusResult>;
}
