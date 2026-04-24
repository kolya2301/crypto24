import { prisma } from '../prisma';
import { audit, auditActions } from '../audit';
import { quotesService } from './quotes.service';
import { paymentEligibilityEngine } from './payment-eligibility.service';
import { paymentRegistry } from '../providers/registry';
import { CryptoCurrency, FiatCurrency, OrderType, PaymentMethod, OrderStatus, KycStatus, KycLevel } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface CreateOrderInput {
  direction: OrderType;
  asset: CryptoCurrency;
  fiatCurrency: FiatCurrency;
  fiatAmount?: number;
  cryptoAmount?: number;
  paymentMethod: PaymentMethod;
  walletId?: string;
  quoteId: string;
  legalAcknowledged: boolean;
}

export interface AdminOrderActionInput {
  action: 'approve' | 'reject' | 'hold' | 'request_documents' | 'mark_payment_received' | 'mark_crypto_sent' | 'complete';
  notes?: string;
  rejectionReason?: string;
}

export class OrdersService {

  /**
   * Create an order from a valid quote.
   * Creates in DRAFT status — user must call submit() separately.
   *
   * Legal acknowledgment is MANDATORY. Order cannot be created without it.
   */
  async create(userId: string, input: CreateOrderInput, ip: string) {
    if (!input.legalAcknowledged) {
      throw new Error('LEGAL_ACKNOWLEDGMENT_REQUIRED');
    }

    const quote = await quotesService.getValid(input.quoteId, userId);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { kycProfile: true },
    });

    // Wallet validation for crypto orders
    let walletId: string | null = null;
    if (input.walletId) {
      const wallet = await prisma.wallet.findFirst({
        where: { id: input.walletId, userId, asset: input.asset },
      });
      if (!wallet) throw new Error('WALLET_NOT_FOUND');
      if (wallet.verificationStatus !== 'verified') throw new Error('WALLET_NOT_VERIFIED');
      walletId = wallet.id;
    }

    const order = await prisma.order.create({
      data: {
        userId,
        type: input.direction,
        asset: input.asset,
        fiatCurrency: input.fiatCurrency,
        fiatAmount: quote.fiatAmount,
        cryptoAmount: quote.cryptoAmount,
        rate: quote.rate,
        spread: quote.spreadPercent,
        feeAmount: quote.feeAmount,
        quoteId: input.quoteId,
        quoteExpiresAt: quote.expiresAt,
        paymentMethodRequested: input.paymentMethod,
        walletId,
        status: OrderStatus.draft,
        legalAcknowledged: true,
        kycApproved: user.kycProfile?.status === KycStatus.approved,
      },
    });

    await audit({
      actorUserId: userId, subjectUserId: userId,
      entityType: 'order', entityId: order.id, orderId: order.id,
      action: auditActions.ORDER_CREATED,
      description: `Order created: ${input.direction} ${quote.cryptoAmount} ${input.asset}`,
      afterJson: { type: input.direction, asset: input.asset, method: input.paymentMethod },
      ipAddress: ip,
    });

    return order;
  }

  /**
   * Submit order for compliance review.
   * Runs ALL compliance gates. If any fail, order goes to REJECTED (not compliance_review).
   *
   * This is NOT instant swap. Every order requires human review before payment is enabled.
   */
  async submit(orderId: string, userId: string, ip: string) {
    const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new Error('ORDER_NOT_FOUND');
    if (order.status !== OrderStatus.draft) throw new Error('ORDER_NOT_DRAFT');

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { kycProfile: true },
    });

    const kycProfile = user.kycProfile;

    // ── Compile all compliance flags ──────────────────────────────────────────

    const kycApproved = kycProfile?.status === KycStatus.approved;
    const sanctionsCleared = kycProfile ? !kycProfile.sanctionsFlag && !!kycProfile.sanctionsCheckedAt : false;
    const quoteValid = order.quoteExpiresAt ? order.quoteExpiresAt > new Date() : false;

    // Payment method eligibility
    const eligibility = await paymentEligibilityEngine.check({
      userId,
      orderId,
      orderType: order.type,
      paymentMethod: order.paymentMethodRequested,
      fiatAmountIls: Number(order.fiatAmount),
      asset: order.asset,
      userKycStatus: kycProfile?.status ?? KycStatus.not_submitted,
      userKycLevel: kycProfile?.level ?? KycLevel.none,
      userRiskScore: user.riskScore,
      isPepFlagged: kycProfile?.pepFlag ?? false,
      isSanctionsFlagged: kycProfile?.sanctionsFlag ?? false,
    });

    const walletValidated = order.walletId
      ? !!(await prisma.wallet.findFirst({ where: { id: order.walletId, verificationStatus: 'verified' } }))
      : order.paymentMethodRequested !== PaymentMethod.CRYPTO_ONLY;

    const failures: string[] = [];
    if (!kycApproved) failures.push('kyc_not_approved');
    if (!sanctionsCleared) failures.push('sanctions_check_required');
    if (!eligibility.eligible) failures.push(...eligibility.failures);
    if (!walletValidated) failures.push('wallet_not_verified');
    if (!quoteValid) failures.push('quote_expired');
    if (!order.legalAcknowledged) failures.push('legal_acknowledgment_missing');

    const passed = failures.length === 0;

    const newStatus = passed ? OrderStatus.pending_review : OrderStatus.rejected;

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        kycApproved,
        sanctionsCleared,
        paymentMethodEligible: eligibility.eligible,
        walletValidated,
        quoteValid,
        complianceNotes: failures.length > 0 ? failures.join('; ') : null,
        rejectionReason: passed ? null : `Compliance checks failed: ${failures.join(', ')}`,
      },
    });

    if (passed) {
      await quotesService.markUsed(order.quoteId!);
    }

    await audit({
      actorUserId: userId, subjectUserId: userId,
      entityType: 'order', entityId: orderId, orderId,
      action: passed ? auditActions.ORDER_SUBMITTED : auditActions.ORDER_COMPLIANCE_FAILED,
      description: passed ? 'Order submitted for compliance review' : `Order rejected: ${failures.join(', ')}`,
      beforeJson: { status: order.status },
      afterJson: { status: newStatus, failures, kycApproved, sanctionsCleared, walletValidated },
      ipAddress: ip,
    });

    // Notify user if rejected immediately
    if (!passed) {
      await prisma.notification.create({
        data: {
          userId,
          orderId,
          type: 'order_status_change',
          titleHe: 'ההזמנה נדחתה',
          titleRu: 'Заявка отклонена',
          bodyHe: `ההזמנה נדחתה: ${failures.join(', ')}`,
          bodyRu: `Заявка отклонена: ${failures.join(', ')}`,
        },
      });
    }

    return { order: updated, passed, failures };
  }

  async getUserOrders(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
        include: { wallet: { select: { address: true, asset: true } } },
      }),
      prisma.order.count({ where: { userId } }),
    ]);
    return { orders, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getById(orderId: string, userId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        wallet: true,
        paymentRecords: true,
        legalAcceptances: { include: { document: { select: { type: true, version: true } } } },
      },
    });
    if (!order) throw new Error('ORDER_NOT_FOUND');
    return order;
  }

  async cancel(orderId: string, userId: string, ip: string) {
    const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new Error('ORDER_NOT_FOUND');

    const cancellable: OrderStatus[] = [
      OrderStatus.draft, OrderStatus.submitted, OrderStatus.pending_review,
      OrderStatus.on_hold, OrderStatus.pending_kyc,
    ];
    if (!cancellable.includes(order.status)) throw new Error('ORDER_NOT_CANCELLABLE');

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.cancelled },
    });

    await audit({
      actorUserId: userId, subjectUserId: userId,
      entityType: 'order', entityId: orderId, orderId,
      action: auditActions.ORDER_CANCELLED,
      beforeJson: { status: order.status },
      afterJson: { status: OrderStatus.cancelled },
      ipAddress: ip,
    });

    return updated;
  }

  // ─── Admin Actions ──────────────────────────────────────────────────────────

  async adminList(filters: {
    status?: OrderStatus;
    userId?: string;
    type?: OrderType;
    asset?: CryptoCurrency;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;
    const where = {
      ...(filters.status && { status: filters.status }),
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.type && { type: filters.type }),
      ...(filters.asset && { asset: filters.asset }),
    };
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { fullName: true, email: true } },
          wallet: { select: { address: true, asset: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);
    return { orders, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async adminAction(orderId: string, input: AdminOrderActionInput, adminId: string, ip: string) {
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });

    const statusMap: Record<string, OrderStatus> = {
      approve: OrderStatus.awaiting_payment,
      reject: OrderStatus.rejected,
      hold: OrderStatus.on_hold,
      request_documents: OrderStatus.pending_review,
      mark_payment_received: OrderStatus.awaiting_crypto,
      mark_crypto_sent: OrderStatus.payout_in_progress,
      complete: OrderStatus.completed,
    };

    const newStatus = statusMap[input.action];
    if (!newStatus) throw new Error('INVALID_ACTION');

    const auditActionMap: Record<string, string> = {
      approve: auditActions.ORDER_APPROVED,
      reject: auditActions.ORDER_REJECTED,
      hold: auditActions.ORDER_HELD,
      request_documents: auditActions.ORDER_DOCS_REQUESTED,
      mark_payment_received: auditActions.ORDER_PAYMENT_CONFIRMED,
      mark_crypto_sent: auditActions.ORDER_CRYPTO_SENT,
      complete: auditActions.ORDER_COMPLETED,
    };

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        complianceNotes: input.notes ?? order.complianceNotes,
        rejectionReason: input.rejectionReason ?? order.rejectionReason,
        approvedBy: ['approve', 'complete', 'mark_payment_received', 'mark_crypto_sent'].includes(input.action)
          ? adminId : order.approvedBy,
        approvedAt: input.action === 'approve' ? new Date() : order.approvedAt,
        completedAt: input.action === 'complete' ? new Date() : order.completedAt,
        paymentMethodApproved: input.action === 'approve' ? order.paymentMethodRequested : order.paymentMethodApproved,
      },
    });

    await audit({
      actorUserId: adminId, actorRole: 'admin',
      subjectUserId: order.userId,
      entityType: 'order', entityId: orderId, orderId,
      action: auditActionMap[input.action],
      description: `Admin ${input.action} on order ${orderId}`,
      beforeJson: { status: order.status },
      afterJson: { status: newStatus, notes: input.notes },
      ipAddress: ip,
    });

    await prisma.notification.create({
      data: {
        userId: order.userId,
        orderId,
        type: 'order_status_change',
        titleHe: `הזמנה עודכנה: ${newStatus}`,
        titleRu: `Заявка обновлена: ${newStatus}`,
        bodyHe: input.notes ?? `סטטוס ההזמנה שלך עודכן ל-${newStatus}`,
        bodyRu: input.notes ?? `Статус вашей заявки обновлён: ${newStatus}`,
      },
    });

    return updated;
  }

  async adminInitiatePayment(orderId: string, adminId: string, ip: string) {
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { user: true },
    });

    if (order.status !== OrderStatus.awaiting_payment) throw new Error('ORDER_NOT_AWAITING_PAYMENT');

    const provider = paymentRegistry.get(order.paymentMethodApproved ?? order.paymentMethodRequested);
    const result = await provider.createPaymentRequest(
      {
        orderId,
        amount: Number(order.fiatAmount),
        currency: order.fiatCurrency,
        reference: orderId.slice(0, 8).toUpperCase(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      order,
      order.user,
    );

    await prisma.paymentRecord.create({
      data: {
        orderId,
        method: order.paymentMethodApproved ?? order.paymentMethodRequested,
        provider: provider.methodType,
        providerReference: result.providerReference,
        amount: order.fiatAmount,
        currency: order.fiatCurrency,
        status: 'pending',
        notes: result.instructions,
      },
    });

    await audit({
      actorUserId: adminId, actorRole: 'admin',
      entityType: 'order', entityId: orderId, orderId,
      action: auditActions.PAYMENT_INITIATED,
      description: `Payment initiated via ${provider.methodType}`,
      afterJson: { providerReference: result.providerReference, isStub: result.isStub },
      ipAddress: ip,
    });

    return { order, paymentResult: result };
  }
}

export const ordersService = new OrdersService();
