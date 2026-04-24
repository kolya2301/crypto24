import { IPaymentProvider } from './payment-provider.interface';
import { BitProvider } from './bit.provider';
import { PayBoxProvider } from './paybox.provider';
import { CryptoTransferProvider } from './crypto.provider';
import { PaymentMethod } from '@prisma/client';

class PaymentProviderRegistry {
  private readonly providers = new Map<string, IPaymentProvider>([
    ['BIT',         new BitProvider()],
    ['PAYBOX',      new PayBoxProvider()],
    ['CRYPTO_ONLY', new CryptoTransferProvider()],
  ]);

  get(method: PaymentMethod): IPaymentProvider {
    const p = this.providers.get(method);
    if (!p) throw new Error(`No payment provider registered for method: ${method}`);
    return p;
  }

  getAvailable(): IPaymentProvider[] {
    return Array.from(this.providers.values()).filter(p => p.isAvailable());
  }

  /** Register a new provider at runtime (e.g. from plugin) */
  register(method: string, provider: IPaymentProvider): void {
    this.providers.set(method, provider);
  }
}

export const paymentRegistry = new PaymentProviderRegistry();
