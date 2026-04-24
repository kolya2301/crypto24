import { prisma } from './prisma';
import { UserRole } from '@prisma/client';

interface AuditEntry {
  actorUserId?: string | null;
  actorRole?: UserRole | string | null;
  subjectUserId?: string | null;
  entityType?: string;
  entityId?: string;
  orderId?: string;
  action: string;
  description?: string;
  beforeJson?: unknown;
  afterJson?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Write an immutable audit log entry.
 * Must be called for EVERY admin and user action.
 * Failures are logged to stderr but never throw — audit must not break flows.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: entry.actorUserId ?? null,
        actorRole: entry.actorRole?.toString() ?? null,
        subjectUserId: entry.subjectUserId ?? null,
        entityType: entry.entityType ?? null,
        entityId: entry.entityId ?? null,
        orderId: entry.orderId ?? null,
        action: entry.action,
        description: entry.description ?? null,
        beforeJson: entry.beforeJson ? JSON.stringify(entry.beforeJson) : null,
        afterJson: entry.afterJson ? JSON.stringify(entry.afterJson) : null,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
      },
    });
  } catch (err) {
    console.error('[AUDIT] Failed to write audit log:', err, entry);
  }
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────

export const auditActions = {
  // Auth
  USER_REGISTERED: 'user.registered',
  USER_LOGIN: 'user.login',
  USER_LOGIN_FAILED: 'user.login_failed',
  USER_LOGOUT: 'user.logout',
  USER_SUSPENDED: 'user.suspended',
  USER_REACTIVATED: 'user.reactivated',

  // KYC
  KYC_SUBMITTED: 'kyc.submitted',
  KYC_APPROVED: 'kyc.approved',
  KYC_REJECTED: 'kyc.rejected',
  KYC_HOLD: 'kyc.on_hold',
  KYC_DOC_UPLOADED: 'kyc.document_uploaded',
  KYC_DOC_REVIEWED: 'kyc.document_reviewed',
  SANCTIONS_CHECK: 'kyc.sanctions_check',

  // Orders
  ORDER_CREATED: 'order.created',
  ORDER_SUBMITTED: 'order.submitted',
  ORDER_COMPLIANCE_FAILED: 'order.compliance_failed',
  ORDER_APPROVED: 'order.approved',
  ORDER_REJECTED: 'order.rejected',
  ORDER_HELD: 'order.held',
  ORDER_DOCS_REQUESTED: 'order.documents_requested',
  ORDER_PAYMENT_CONFIRMED: 'order.payment_confirmed',
  ORDER_CRYPTO_SENT: 'order.crypto_sent',
  ORDER_COMPLETED: 'order.completed',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_EXPIRED: 'order.expired',

  // Payments
  PAYMENT_METHOD_CHECK: 'payment.eligibility_checked',
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_RECEIVED: 'payment.received',
  PAYOUT_INITIATED: 'payment.payout_initiated',
  PAYOUT_COMPLETED: 'payment.payout_completed',

  // Wallets
  WALLET_ADDED: 'wallet.added',
  WALLET_VERIFIED: 'wallet.verified',
  WALLET_REJECTED: 'wallet.rejected',

  // Legal
  LEGAL_ACCEPTED: 'legal.accepted',

  // Admin
  ADMIN_CONFIG_CHANGED: 'admin.config_changed',
  ADMIN_RATE_CHANGED: 'admin.rate_changed',
  ADMIN_PAYMENT_METHOD_TOGGLED: 'admin.payment_method_toggled',
  ADMIN_LEGAL_PUBLISHED: 'admin.legal_doc_published',
};
