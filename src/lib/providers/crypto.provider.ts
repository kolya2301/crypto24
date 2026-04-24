import { Order, User } from '@prisma/client';
import { prisma } from '../prisma';
import { IPaymentProvider, PaymentLimits, PaymentRequest, PaymentRequestResult, PaymentStatusResult, ComplianceNotes } from './payment-provider.interface';

/**
 * CryptoTransferProvider — direct on-chain transfer to company wallet.
 *
 * Funds ONLY go to verified company wallets registered in the DB.
 * Wallet address is looked up fresh from DB on every call — never hardcoded.
 *
 * NEVER auto-complete an order based on a blockchain scan.
 * A finance operator must confirm the on-chain receipt manually.
 */
export class CryptoTransferProvider implements IPaymentProvider {
  readonly methodType = 'CRYPTO_ONLY';
  readonly displayNameHe = 'העברת קריפטו';
  readonly displayNameRu = 'Крипто-перевод';

  isAvailable(): boolean {
    return process.env.PAYMENT_CRYPTO_ENABLED === 'true';
  }

  getLimits(): PaymentLimits {
    return {
      minAmountIls: 500,
      maxAmountIls: 500000,
      supportedCurrencies: ['BTC', 'ETH', 'USDT', 'USDC'],
      supportedDirections: ['buy', 'sell'],
    };
  }

  getComplianceNotes(_order: Order, _user: User): ComplianceNotes {
    return {
      notes: [
        'Crypto transfers must be sent ONLY to the company wallet shown — no other address',
        'Include the order reference in the transaction memo/tag where applicable',
        'Finance operator must confirm on-chain receipt before order progresses',
        'Blockchain confirmation required (minimum 1 confirmation for ETH/USDT, 2 for BTC)',
      ],
      warnings: [
        'Sending to wrong address is irreversible',
        'Do not send from an exchange that may block crypto-to-business transfers',
      ],
      requiresManualConfirmation: true,
    };
  }

  async createPaymentRequest(request: PaymentRequest, order: Order, _user: User): Promise<PaymentRequestResult> {
    const companyWallet = await prisma.companyWallet.findFirst({
      where: { asset: order.asset, isActive: true },
    });

    if (!companyWallet) {
      return {
        success: false,
        providerReference: '',
        instructions: `לא נמצא ארנק חברה פעיל עבור ${order.asset}. אנא צור קשר עם התמיכה.`,
        isStub: false,
      };
    }

    const memo = order.id.slice(0, 8).toUpperCase();

    return {
      success: true,
      providerReference: `CRYPTO-${memo}`,
      instructions: `שלח בדיוק ${order.cryptoAmount} ${order.asset} לכתובת: ${companyWallet.address}\nרשת: ${companyWallet.network}\nמזהה הזמנה (ממו): ${memo}\nחשוב: אל תשלח ממנה אחרת — ההעברה בלתי הפיכה.`,
      instructionsRu: `Отправьте ровно ${order.cryptoAmount} ${order.asset} на адрес: ${companyWallet.address}\nСеть: ${companyWallet.network}\nID заказа (мемо): ${memo}\nВажно: не отправляйте на другой адрес — перевод необратим.`,
      expiresAt: request.expiresAt,
      providerData: {
        companyWallet: companyWallet.address,
        network: companyWallet.network,
        asset: order.asset,
        amount: order.cryptoAmount.toString(),
        memo,
      },
      isStub: false,
    };
  }

  async verifyPaymentStatus(order: Order): Promise<PaymentStatusResult> {
    // STUB: In production, query blockchain explorer API
    // e.g. Etherscan API, Blockstream API, Trongrid API
    // Match by: company wallet address + expected amount + memo
    console.warn('[CryptoProvider] Blockchain verification not yet integrated', { orderId: order.id });
    return {
      status: 'pending',
      providerReference: '',
      providerData: { note: 'Integrate blockchain explorer for automated verification' },
      isStub: true,
    };
  }
}
