import { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { kycService } from '@/lib/services/kyc.service';
import { created, err, unauthorized, serverError } from '@/lib/api-response';
import { KycDocumentType } from '@prisma/client';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const documentType = formData.get('documentType') as KycDocumentType | null;

    if (!file) return err('No file uploaded', 400);
    if (!documentType || !Object.values(KycDocumentType).includes(documentType)) {
      return err('Invalid document type', 400);
    }
    if (!ALLOWED_TYPES.includes(file.type)) return err('File type not allowed. Use JPG, PNG, WebP, or PDF.', 400);
    if (file.size > MAX_SIZE) return err('File too large (max 10 MB)', 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';

    const doc = await kycService.uploadDocument(session.sub, {
      documentType,
      buffer,
      originalName: file.name,
      mimeType: file.type,
    }, ip);

    return created({ id: doc.id, documentType: doc.documentType, status: doc.status, uploadedAt: doc.uploadedAt });
  } catch {
    return serverError();
  }
}
