import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client, getR2Bucket } from './r2';

const getS3Client = getR2Client;
const getBucket = getR2Bucket;

// ─── Upload ───────────────────────────────────────────────────────────────────

export async function uploadDocument(params: {
  key: string;           // e.g. "kyc/{userId}/{docId}.jpg"
  body: Buffer;
  mimeType: string;
  metadata?: Record<string, string>;
}): Promise<string> {
  await getS3Client().send(new PutObjectCommand({
    Bucket: getBucket(),
    Key: params.key,
    Body: params.body,
    ContentType: params.mimeType,
    Metadata: params.metadata,
    ServerSideEncryption: 'AES256',
    // Documents are NEVER public
    ACL: undefined,
  }));
  return params.key;
}

// ─── Signed download URL (short-lived, for admin/user viewing only) ───────────

export async function getSignedDownloadUrl(key: string, expiresInSeconds = 300): Promise<string> {
  const command = new GetObjectCommand({ Bucket: getBucket(), Key: key });
  return getSignedUrl(getS3Client(), command, { expiresIn: expiresInSeconds });
}

// ─── Signed upload URL (for client-side direct upload) ───────────────────────

export async function getSignedUploadUrl(params: {
  key: string;
  mimeType: string;
  maxSizeBytes?: number;
  expiresInSeconds?: number;
}): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: params.key,
    ContentType: params.mimeType,
    ServerSideEncryption: 'AES256',
  });
  return getSignedUrl(getS3Client(), command, { expiresIn: params.expiresInSeconds ?? 600 });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteDocument(key: string): Promise<void> {
  await getS3Client().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }));
}

// ─── Key builders ─────────────────────────────────────────────────────────────

export const s3Keys = {
  kycDocument: (userId: string, docId: string, ext: string) =>
    `kyc/${userId}/${docId}.${ext}`,
  orderDocument: (orderId: string, docId: string, ext: string) =>
    `orders/${orderId}/${docId}.${ext}`,
};
