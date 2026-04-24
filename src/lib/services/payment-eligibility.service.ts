import { prisma } from '../prisma';
import { PaymentMethod, OrderType, KycLevel, KycStatus } from '@prisma/client';
import { audit, auditActions } from '../audit';

/**
 * PaymentEligibilityEngine
 *
 * Decides whether a given payment method is allowed for a specific order.
 * An order CANNOT proceed to payment without passing ALL checks here.
 *
 * RULE: Never mark an order as payable just because the user selected Bit or PayBox.
 * Payment eligibility must be explicitly verified by this engine AND confirmed by admin.
 */

export interface EligibilityContext {
  userId: string;
  orderId: string;
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  fiatAmountIls: number;
  asset: string;
  userKycStatus: KycStatus;
  userKycLevel: KycLevel;
  userRiskScore: number;
  isPepFlagged: boolean;
  isSanctionsFlagged: boolean;
}

export interface EligibilityResult {
  eligible: boolean;
  requiresManualApproval: boolean;
  checks: EligibilityChecks;
  failures: string[];
  notes: string[];
}

interface EligibilityChecks {
  providerEnabled: boolean;
  directionAllowed: boolean;
  amountWithinLimits: boolean;
  kycLevelSufficient: boolean;
  riskScoreAcceptable: boolean;
  notPepFlagged: boolean;
  notSanctionsFlagged: boolean;
  businessIntegrationActive: boolean;
  assetAllowed: boolean;
  adminEnabled: boolean;
}

const KYC_LEVEL_RANK: Record<KycLevel, number> = {
  none: 0,
  basic: 1,
  enhanced: 2,
  full: 3,
};

export class PaymentEligibilityEngine {
  async check(ctx: EligibilityContext): Promise<EligibilityResult> {
    const config = await prisma.paymentMethodConfig.findUnique({
      where: { method: ctx.paymentMethod },
    });

    const failures: string[] = [];
    const notes: string[] = [];

    // 1. Admin has enabled this method
    const adminEnabled = config?.status === 'active';
    if (!adminEnabled) failures.push('payment_method_disabled_by_admin');

    // 2. Business integration is configured
    const businessIntegrationActive = this.checkBusinessIntegration(ctx.paymentMethod);
    if (!businessIntegrationActive) {
      failures.push('business_integration_not_configured');
      notes.push(`${ctx.paymentMethod} requires approved business onboarding before it can be used`);
    }

    // 3. Direction allowed for this method
    const directionAllowed = ctx.orderType === OrderType.buy
      ? (config?.allowedForBuy ?? false)
      : (config?.allowedForSell ?? false);
    if (!directionAllowed) failures.push(`payment_method_not_allowed_for_${ctx.orderType}`);

    // 4. Amount within limits (convert to ILS if needed — simplified here)
    const min = Number(config?.minAmountIls ?? 200);
    const max = Number(config?.maxAmountIls ?? 50000);
    const amountWithinLimits = ctx.fiatAmountIls >= min && ctx.fiatAmountIls <= max;
    if (!amountWithinLimits) failures.push(`amount_outside_limits_min_${min}_max_${max}_ils`);

    // 5. KYC level sufficient
    const requiredLevel = config?.requiresKycLevel ?? KycLevel.basic;
    const kycLevelSufficient =
      ctx.userKycStatus === 'approved' &&
      KYC_LEVEL_RANK[ctx.userKycLevel] >= KYC_LEVEL_RANK[requiredLevel];
    if (!kycLevelSufficient) failures.push('kyc_level_insufficient');

    // 6. Risk score acceptable
    const maxRisk = config?.maxRiskScore ?? 70;
    const riskScoreAcceptable = ctx.userRiskScore <= maxRisk;
    if (!riskScoreAcceptable) {
      failures.push('risk_score_too_high');
      notes.push('Order requires enhanced compliance review');
    }

    // 7. PEP flag
    const notPepFlagged = !ctx.isPepFlagged;
    if (!notPepFlagged) {
      failures.push('user_is_pep_flagged');
      notes.push('PEP-flagged users require enhanced due diligence before payment methods are approved');
    }

    // 8. Sanctions flag
    const notSanctionsFlagged = !ctx.isSanctionsFlagged;
    if (!notSanctionsFlagged) failures.push('user_is_sanctions_flagged');

    // 9. Asset allowed
    const allowedAssetsRaw = config?.allowedAssets;
    let assetAllowed = true;
    if (allowedAssetsRaw) {
      try {
        const allowed = JSON.parse(allowedAssetsRaw) as string[];
        assetAllowed = allowed.includes(ctx.asset);
        if (!assetAllowed) failures.push(`asset_${ctx.asset}_not_allowed_for_this_payment_method`);
      } catch {
        // malformed config — allow but note it
        notes.push('Warning: allowedAssets config is malformed');
      }
    }

    // 10. Provider-level availability check
    const providerEnabled = this.checkProviderAvailability(ctx.paymentMethod);
    if (!providerEnabled) failures.push('payment_provider_unavailable');

    const checks: EligibilityChecks = {
      adminEnabled,
      businessIntegrationActive,
      directionAllowed,
      amountWithinLimits,
      kycLevelSufficient,
      riskScoreAcceptable,
      notPepFlagged,
      notSanctionsFlagged,
      assetAllowed,
      providerEnabled,
    };

    const eligible = failures.length === 0;
    const requiresManualApproval = config?.requiresManualApproval ?? true;

    await audit({
      actorUserId: ctx.userId,
      entityType: 'order',
      entityId: ctx.orderId,
      orderId: ctx.orderId,
      action: auditActions.PAYMENT_METHOD_CHECK,
      description: `Payment eligibility check for ${ctx.paymentMethod}: ${eligible ? 'PASSED' : 'FAILED'}`,
      afterJson: { eligible, checks, failures, notes },
    });

    return { eligible, requiresManualApproval, checks, failures, notes };
  }

  /**
   * Checks if business integration is configured in env.
   * In production: verify API keys / partner credentials exist.
   */
  private checkBusinessIntegration(method: PaymentMethod): boolean {
    switch (method) {
      case 'BIT':
        // Real Bit business integration requires partner onboarding
        // Replace with actual credential check
        return process.env.PAYMENT_BIT_ENABLED === 'true';
      case 'PAYBOX':
        return process.env.PAYMENT_PAYBOX_ENABLED === 'true';
      case 'CRYPTO_ONLY':
        return process.env.PAYMENT_CRYPTO_ENABLED === 'true';
      case 'MANUAL_BANK_OPTION_DISABLED_BY_DEFAULT':
        return false; // Disabled by default as specified
      default:
        return false;
    }
  }

  private checkProviderAvailability(method: PaymentMethod): boolean {
    // In production: health-check the provider API
    return this.checkBusinessIntegration(method);
  }
}

export const paymentEligibilityEngine = new PaymentEligibilityEngine();
