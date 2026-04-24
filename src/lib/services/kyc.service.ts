import { prisma } from '../prisma';
import { audit, auditActions } from '../audit';
import { KycStatus, KycLevel, KycDocumentType, DocumentStatus } from '@prisma/client';
import { s3Keys, uploadDocument, getSignedDownloadUrl } from '../s3';
import { encrypt, decrypt } from '../encryption';
import { randomUUID } from 'crypto';

export class KycService {
  async getProfile(userId: string) {
    return prisma.kycProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { fullName: true, email: true, phone: true } },
      },
    });
  }

  async submitProfile(userId: string, data: {
    dateOfBirth: Date;
    idNumber: string;
    idType: 'il_id' | 'passport';
    address: string;
    city: string;
    postalCode: string;
    country: string;
    sourceOfFunds: string;
    sourceOfFundsNote?: string;
  }, ip: string) {
    const encryptedId = await encrypt(data.idNumber);

    const profile = await prisma.kycProfile.upsert({
      where: { userId },
      update: {
        dateOfBirth: data.dateOfBirth,
        idNumber: encryptedId,
        idType: data.idType,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        country: data.country,
        sourceOfFundsStatus: data.sourceOfFunds,
        sourceOfFundsNote: data.sourceOfFundsNote,
        status: KycStatus.pending_review,
        submittedAt: new Date(),
      },
      create: {
        userId,
        dateOfBirth: data.dateOfBirth,
        idNumber: encryptedId,
        idType: data.idType,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        country: data.country,
        sourceOfFundsStatus: data.sourceOfFunds,
        sourceOfFundsNote: data.sourceOfFundsNote,
        status: KycStatus.pending_review,
        submittedAt: new Date(),
      },
    });

    await audit({
      actorUserId: userId, subjectUserId: userId,
      entityType: 'kyc', entityId: profile.id,
      action: auditActions.KYC_SUBMITTED,
      description: 'User submitted KYC profile',
      ipAddress: ip,
    });

    return profile;
  }

  async uploadDocument(userId: string, params: {
    documentType: KycDocumentType;
    buffer: Buffer;
    originalName: string;
    mimeType: string;
  }, ip: string) {
    const docId = randomUUID();
    const ext = params.originalName.split('.').pop() ?? 'bin';
    const key = s3Keys.kycDocument(userId, docId, ext);

    await uploadDocument({ key, body: params.buffer, mimeType: params.mimeType, metadata: { userId, docId } });

    const doc = await prisma.kycDocument.create({
      data: {
        id: docId,
        userId,
        documentType: params.documentType,
        fileUrl: key,
        originalName: params.originalName,
        mimeType: params.mimeType,
        sizeBytes: params.buffer.length,
        status: DocumentStatus.pending,
      },
    });

    await audit({
      actorUserId: userId, subjectUserId: userId,
      entityType: 'kyc_document', entityId: doc.id,
      action: auditActions.KYC_DOC_UPLOADED,
      description: `KYC document uploaded: ${params.documentType}`,
      ipAddress: ip,
    });

    return doc;
  }

  async getDocumentUrl(docId: string, requestingUserId: string, isAdmin: boolean) {
    const doc = await prisma.kycDocument.findUniqueOrThrow({ where: { id: docId } });
    if (!isAdmin && doc.userId !== requestingUserId) throw new Error('FORBIDDEN');
    return getSignedDownloadUrl(doc.fileUrl, 300);
  }

  // ─── Admin actions ──────────────────────────────────────────────────────────

  async reviewKyc(params: {
    userId: string;
    status: KycStatus;
    level?: KycLevel;
    rejectionReason?: string;
    internalNotes?: string;
    reviewerUserId: string;
    ip: string;
  }) {
    const before = await prisma.kycProfile.findUnique({ where: { userId: params.userId } });

    const profile = await prisma.kycProfile.update({
      where: { userId: params.userId },
      data: {
        status: params.status,
        level: params.level ?? (params.status === KycStatus.approved ? KycLevel.basic : undefined),
        rejectionReason: params.rejectionReason,
        internalNotes: params.internalNotes,
        reviewedBy: params.reviewerUserId,
        reviewedAt: new Date(),
        expiresAt: params.status === KycStatus.approved
          ? new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000)
          : null,
      },
    });

    const auditAction = params.status === KycStatus.approved
      ? auditActions.KYC_APPROVED
      : params.status === KycStatus.rejected
      ? auditActions.KYC_REJECTED
      : auditActions.KYC_HOLD;

    await audit({
      actorUserId: params.reviewerUserId,
      subjectUserId: params.userId,
      entityType: 'kyc', entityId: profile.id,
      action: auditAction,
      description: `KYC ${params.status} by compliance officer`,
      beforeJson: before,
      afterJson: profile,
      ipAddress: params.ip,
    });

    // Notify user
    const titleMap: Record<string, { he: string; ru: string }> = {
      approved: { he: 'אימות זהות אושר', ru: 'Верификация одобрена' },
      rejected: { he: 'אימות זהות נדחה', ru: 'Верификация отклонена' },
      more_info_required: { he: 'נדרש מסמך נוסף', ru: 'Требуется дополнительный документ' },
    };
    const title = titleMap[params.status] ?? { he: 'עדכון סטטוס KYC', ru: 'Обновление статуса KYC' };

    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: 'kyc_status_change',
        titleHe: title.he,
        titleRu: title.ru,
        bodyHe: params.rejectionReason ?? title.he,
        bodyRu: params.rejectionReason ?? title.ru,
      },
    });

    return profile;
  }

  async runSanctionsCheck(userId: string, actorId: string, ip: string) {
    /**
     * PLACEHOLDER — integrate with licensed screening provider.
     * Options: ComplyAdvantage, Refinitiv World-Check, OFAC SDN API, Dow Jones Risk.
     *
     * This must be replaced before processing any real transactions.
     * Current behaviour: marks as checked with a warning flag in audit log.
     */
    const cleared = true; // REPLACE with real API result
    const now = new Date();

    await prisma.kycProfile.update({
      where: { userId },
      data: {
        sanctionsFlag: !cleared,
        sanctionsCheckedAt: now,
      },
    });

    await audit({
      actorUserId: actorId, subjectUserId: userId,
      entityType: 'kyc', entityId: userId,
      action: auditActions.SANCTIONS_CHECK,
      description: 'Sanctions screening run (PLACEHOLDER)',
      afterJson: { cleared, source: 'placeholder', warning: 'REPLACE_WITH_REAL_PROVIDER' },
      ipAddress: ip,
    });

    return {
      cleared,
      warning: 'SANCTIONS SCREENING IS A PLACEHOLDER. Integrate a licensed provider before production.',
    };
  }

  async getDecryptedIdNumber(userId: string, requestingAdminId: string, ip: string): Promise<string> {
    const profile = await prisma.kycProfile.findUniqueOrThrow({ where: { userId } });
    if (!profile.idNumber) throw new Error('NO_ID_NUMBER');

    await audit({
      actorUserId: requestingAdminId, subjectUserId: userId,
      entityType: 'kyc', entityId: profile.id,
      action: 'kyc.id_number_accessed',
      description: 'Admin accessed encrypted ID number',
      ipAddress: ip,
    });

    return decrypt(profile.idNumber);
  }
}

export const kycService = new KycService();
