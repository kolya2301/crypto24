/**
 * Field-level encryption for sensitive PII (ID number, address, etc.)
 * Uses AES-256-GCM via Web Crypto API (available in Node.js + Edge runtimes)
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const rawKey = Buffer.from(process.env.JWT_SECRET!.padEnd(32).slice(0, 32), 'utf8');
  cachedKey = await crypto.subtle.importKey('raw', rawKey, { name: ALGORITHM, length: KEY_LENGTH }, false, ['encrypt', 'decrypt']);
  return cachedKey;
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return Buffer.from(combined).toString('base64');
}

export async function decrypt(cipherBase64: string): Promise<string> {
  const key = await getKey();
  const combined = Buffer.from(cipherBase64, 'base64');
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}
