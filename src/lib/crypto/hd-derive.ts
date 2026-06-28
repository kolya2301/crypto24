import * as bitcoin from 'bitcoinjs-lib';
import { BIP32Factory } from 'bip32';
import * as ecc from '@bitcoinerlab/secp256k1';
import bs58check from 'bs58check';

const bip32 = BIP32Factory(ecc);

type DerivableAsset = 'BTC' | 'LTC';

const NETWORKS: Record<DerivableAsset, bitcoin.Network> = {
  BTC: bitcoin.networks.bitcoin,
  LTC: {
    messagePrefix: '\x19Litecoin Signed Message:\n',
    bech32: 'ltc',
    bip32: { public: 0x019da462, private: 0x019d9cfe },
    pubKeyHash: 0x30,
    scriptHash: 0x32,
    wif: 0xb0,
  },
};

// Wallets (notably some Electrum-LTC builds) may export a master key with a
// version prefix that doesn't match the target network's expected bip32
// version bytes (e.g. a BTC-style zpub instead of an LTC-specific one). We
// normalize by rewriting the version bytes to match the target network
// before parsing, rather than trusting whatever prefix the wallet emitted.
function normalizeForNetwork(xpub: string, network: bitcoin.Network): string {
  const decoded = bs58check.decode(xpub);
  const payload = decoded.subarray(4);
  const versionBuf = Buffer.alloc(4);
  versionBuf.writeUInt32BE(network.bip32.public, 0);
  return bs58check.encode(Buffer.concat([versionBuf, Buffer.from(payload)]));
}

export function isValidXpub(xpub: string, asset: DerivableAsset): boolean {
  try {
    const normalized = normalizeForNetwork(xpub, NETWORKS[asset]);
    const node = bip32.fromBase58(normalized, NETWORKS[asset]);
    return node.isNeutered(); // must be a public-only key (neutered)
  } catch {
    return false;
  }
}

export function deriveAddressFromXpub(xpub: string, index: number, asset: DerivableAsset): string {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error(`Invalid derivation index: ${index}`);
  }
  const network = NETWORKS[asset];
  const normalized = normalizeForNetwork(xpub, network);
  const root = bip32.fromBase58(normalized, network);
  const child = root.derive(0).derive(index); // m/0/{index} — external receive chain
  const { address } = bitcoin.payments.p2wpkh({ pubkey: child.publicKey, network });
  if (!address) throw new Error(`Failed to derive ${asset} address at index ${index}`);
  return address;
}
