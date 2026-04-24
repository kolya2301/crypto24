import { PrismaClient, UserRole, FiatCurrency, CryptoCurrency, KycStatus, KycLevel } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcryptjs.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cryptochange.local' },
    update: {},
    create: {
      email: 'admin@cryptochange.local',
      phone: '+972501234567',
      fullName: 'System Admin',
      passwordHash: adminPassword,
      role: UserRole.admin,
      status: 'active',
      isEmailVerified: true,
      isPhoneVerified: true,
    },
  });
  console.log('✓ Admin user created:', admin.id);

  // Create payment method configs
  const paymentMethods = [
    {
      method: 'BIT',
      displayNameHe: 'Bit',
      displayNameRu: 'Bit',
      minAmountIls: 200,
      maxAmountIls: 50000,
    },
    {
      method: 'PAYBOX',
      displayNameHe: 'Paybox',
      displayNameRu: 'Paybox',
      minAmountIls: 500,
      maxAmountIls: 100000,
    },
    {
      method: 'CRYPTO_ONLY',
      displayNameHe: 'Crypto רק',
      displayNameRu: 'Только крипто',
      minAmountIls: 100,
      maxAmountIls: 500000,
    },
  ];

  for (const method of paymentMethods) {
    await prisma.paymentMethodConfig.upsert({
      where: { method: method.method as any },
      update: {},
      create: {
        method: method.method as any,
        displayNameHe: method.displayNameHe,
        displayNameRu: method.displayNameRu,
        minAmountIls: method.minAmountIls,
        maxAmountIls: method.maxAmountIls,
        status: 'active',
        requiresKycLevel: 'basic' as any,
      },
    });
  }
  console.log('✓ Payment method configs created');

  // Create rate configs for all asset/fiat pairs
  const assets: CryptoCurrency[] = ['BTC', 'ETH', 'USDT', 'USDT_TRC20', 'USDC', 'SOL', 'LTC', 'XMR'];
  const fiats: FiatCurrency[] = ['ILS', 'USD', 'EUR'];

  for (const asset of assets) {
    for (const fiat of fiats) {
      await prisma.rateConfig.upsert({
        where: { asset_fiatCurrency: { asset, fiatCurrency: fiat } },
        update: {},
        create: {
          asset,
          fiatCurrency: fiat,
          spreadPercent: 1.5,
          feePercent: 0.5,
          source: 'manual',
          isActive: true,
        },
      });
    }
  }
  console.log('✓ Rate configs created for all asset/fiat pairs');

  // Create sample legal documents
  const legalDocs = [
    {
      type: 'terms_of_service',
      titleHe: 'תנאי השימוש',
      titleRu: 'Условия использования',
      contentHe: 'תנאי השימוש...',
      contentRu: 'Условия использования...',
    },
    {
      type: 'privacy_policy',
      titleHe: 'מדיניות הפרטיות',
      titleRu: 'Политика конфиденциальности',
      contentHe: 'מדיניות הפרטיות...',
      contentRu: 'Политика конфиденциальности...',
    },
  ];

  for (const doc of legalDocs) {
    await prisma.legalDocument.upsert({
      where: { type: doc.type as any },
      update: {},
      create: {
        type: doc.type as any,
        titleHe: doc.titleHe,
        titleRu: doc.titleRu,
        contentHe: doc.contentHe,
        contentRu: doc.contentRu,
        version: '2024-01-01-v1',
        isPublished: true,
        publishedAt: new Date(),
        publishedBy: admin.id,
      },
    });
  }
  console.log('✓ Legal documents created');

  console.log('✅ Seeding complete!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
