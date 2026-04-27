import { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { ok, unauthorized, err, serverError } from '@/lib/api-response';
import { verifyKycDocument } from '@/lib/services/kyc-ai-verify.service';
import { prisma } from '@/lib/prisma';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();

  if (!process.env.ANTHROPIC_API_KEY) return err('AI verification not configured', 503);

  try {
    const formData = await req.formData();
    const idFrontFile = formData.get('idFront') as File | null;
    const idBackFile = formData.get('idBack') as File | null;
    const expectedIdNumber = formData.get('idNumber') as string | null;
    const expectedDob = formData.get('dateOfBirth') as string | null;

    if (!idFrontFile) return err('Front document image required', 400);
    if (!ALLOWED_TYPES.includes(idFrontFile.type)) return err('File type not allowed. Use JPG, PNG, or WebP.', 400);
    if (idFrontFile.size > MAX_SIZE) return err('File too large (max 10 MB)', 400);
    if (!expectedIdNumber || !expectedDob) return err('Missing idNumber or dateOfBirth', 400);

    const images: { buffer: Buffer; mimeType: string }[] = [
      { buffer: Buffer.from(await idFrontFile.arrayBuffer()), mimeType: idFrontFile.type },
    ];

    if (idBackFile && ALLOWED_TYPES.includes(idBackFile.type) && idBackFile.size <= MAX_SIZE) {
      images.push({ buffer: Buffer.from(await idBackFile.arrayBuffer()), mimeType: idBackFile.type });
    }

    const result = await verifyKycDocument({
      images,
      expectedIdNumber,
      expectedDateOfBirth: expectedDob,
    });

    await prisma.kycProfile.updateMany({
      where: { userId: session.sub },
      data: {
        aiVerificationPassed: result.passed,
        aiVerificationResult: result as object,
      },
    });

    return ok(result);
  } catch (e) {
    console.error('AI verify error:', e);
    return serverError();
  }
}
