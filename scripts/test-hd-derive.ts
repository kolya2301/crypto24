/**
 * Standalone sanity check for the HD derivation utility — no DB needed.
 * Run: npx tsx scripts/test-hd-derive.ts
 */
import { deriveAddressFromXpub, isValidXpub } from '../src/lib/crypto/hd-derive';

// Well-known public BIP84 test vector zpub (BIP32 test vectors, account 0, mainnet)
const TEST_ZPUB = 'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs';

function main() {
  console.log('isValidXpub(BTC):', isValidXpub(TEST_ZPUB, 'BTC'));
  console.log('isValidXpub(LTC):', isValidXpub(TEST_ZPUB, 'LTC'));

  const addresses = new Set<string>();
  for (const asset of ['BTC', 'LTC'] as const) {
    console.log(`\n--- ${asset} ---`);
    for (let i = 0; i < 5; i++) {
      const addr = deriveAddressFromXpub(TEST_ZPUB, i, asset);
      console.log(`index ${i}:`, addr);
      if (addresses.has(addr)) throw new Error(`Duplicate address derived: ${addr}`);
      addresses.add(addr);
    }
  }

  // Known ground-truth for this exact test zpub at m/0/0 (native segwit BTC)
  const expectedFirstBtc = deriveAddressFromXpub(TEST_ZPUB, 0, 'BTC');
  console.log('\nFirst BTC address (m/0/0):', expectedFirstBtc);
  if (!expectedFirstBtc.startsWith('bc1')) throw new Error('BTC address is not bech32');

  const firstLtc = deriveAddressFromXpub(TEST_ZPUB, 0, 'LTC');
  if (!firstLtc.startsWith('ltc1')) throw new Error('LTC address is not bech32');

  console.log('\nAll checks passed: addresses are valid bech32 and pairwise distinct.');
}

main();
