import { S3Client } from '@aws-sdk/client-s3'

let _r2Client: S3Client | null = null

export function getR2Client(): S3Client {
  if (!_r2Client) {
    const endpoint = process.env.R2_ENDPOINT || process.env.S3_ENDPOINT
    const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error('R2 credentials not configured (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)')
    }

    _r2Client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    })
  }
  return _r2Client
}

export function getR2Bucket(): string {
  const bucket = process.env.R2_BUCKET_NAME || process.env.S3_BUCKET_NAME
  if (!bucket) throw new Error('R2_BUCKET_NAME not configured')
  return bucket
}
