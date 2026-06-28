/**
 * One-off CLI to register/update a company wallet's xpub for HD address derivation.
 *
 * Usage:
 *   npx tsx scripts/set-company-wallet-xpub.ts --asset BTC --xpub zpub6... --address bc1... [--label "Electrum BTC"]
 */
import { PrismaClient, CryptoCurrency } from '@prisma/client';
import { isValidXpub } from '../src/lib/crypto/hd-derive';

const prisma = new PrismaClient();

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

async function main() {
  const asset = getArg('asset');
  const xpub = getArg('xpub');
  const address = getArg('address');
  const label = getArg('label');

  if (!asset || !xpub || !address) {
    console.error('Usage: npx tsx scripts/set-company-wallet-xpub.ts --asset BTC|LTC --xpub <zpub> --address <fallback address> [--label <label>]');
    process.exit(1);
  }
  if (asset !== 'BTC' && asset !== 'LTC') {
    console.error('Only BTC and LTC are supported for HD derivation.');
    process.exit(1);
  }
  if (!isValidXpub(xpub, asset)) {
    console.error('The provided xpub does not look valid for', asset);
    process.exit(1);
  }

  const assetEnum = asset as CryptoCurrency;

  const wallet = await prisma.companyWallet.upsert({
    where: { asset_address: { asset: assetEnum, address } },
    create: {
      asset: assetEnum,
      address,
      label,
      addedBy: 'cli-script',
      derivationScheme: 'BIP84_SEGWIT',
      xpub,
      nextIndex: 0,
    },
    update: {
      derivationScheme: 'BIP84_SEGWIT',
      xpub,
      label: label ?? undefined,
    },
  });

  console.log('Company wallet updated:', wallet);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
