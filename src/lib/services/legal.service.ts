import { prisma } from '../prisma';
import { audit, auditActions } from '../audit';
import { LegalDocumentType } from '@prisma/client';

export class LegalService {
  async getPublished(type: LegalDocumentType, locale: 'he' | 'ru' = 'he') {
    const doc = await prisma.legalDocument.findFirst({
      where: { type, isPublished: true },
    });
    if (!doc) return null;
    return {
      id: doc.id,
      type: doc.type,
      title: locale === 'he' ? doc.titleHe : doc.titleRu,
      content: locale === 'he' ? doc.contentHe : doc.contentRu,
      version: doc.version,
      publishedAt: doc.publishedAt,
    };
  }

  async getAllPublished(locale: 'he' | 'ru' = 'he') {
    const docs = await prisma.legalDocument.findMany({ where: { isPublished: true } });
    return docs.map(d => ({
      id: d.id,
      type: d.type,
      title: locale === 'he' ? d.titleHe : d.titleRu,
      version: d.version,
      publishedAt: d.publishedAt,
    }));
  }

  /**
   * Record legal acceptance — immutable record per spec.
   * Stores: full document text, version, timestamp, IP, userId, orderId.
   */
  async recordAcceptance(params: {
    userId: string;
    orderId?: string;
    documentType: LegalDocumentType;
    ipAddress: string;
    userAgent: string;
    locale: 'he' | 'ru';
  }) {
    const doc = await prisma.legalDocument.findFirst({
      where: { type: params.documentType, isPublished: true },
    });
    if (!doc) throw new Error(`No published document found for type: ${params.documentType}`);

    const contentSnapshot = params.locale === 'he' ? doc.contentHe : doc.contentRu;

    const acceptance = await prisma.legalAcceptance.create({
      data: {
        userId: params.userId,
        orderId: params.orderId ?? null,
        documentId: doc.id,
        documentType: params.documentType,
        documentVersion: doc.version,
        contentSnapshot,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        locale: params.locale,
      },
    });

    await audit({
      actorUserId: params.userId,
      entityType: 'legal_acceptance', entityId: acceptance.id,
      orderId: params.orderId,
      action: auditActions.LEGAL_ACCEPTED,
      description: `User accepted ${params.documentType} v${doc.version}`,
      afterJson: { documentType: params.documentType, version: doc.version, ipAddress: params.ipAddress },
    });

    return acceptance;
  }

  async getUserAcceptances(userId: string) {
    return prisma.legalAcceptance.findMany({
      where: { userId },
      include: { document: { select: { type: true, version: true } } },
      orderBy: { acceptedAt: 'desc' },
    });
  }

  // ─── Admin ──────────────────────────────────────────────────────────────────

  async upsertDocument(data: {
    type: LegalDocumentType;
    titleHe: string;
    titleRu: string;
    contentHe: string;
    contentRu: string;
    version: string;
  }, adminId: string) {
    const doc = await prisma.legalDocument.upsert({
      where: { type: data.type },
      create: { ...data, isPublished: false, publishedBy: adminId },
      update: { ...data, isPublished: false, publishedBy: adminId },
    });

    await audit({
      actorUserId: adminId, actorRole: 'admin',
      entityType: 'legal_document', entityId: doc.id,
      action: 'admin.legal_doc_updated',
      description: `Legal document updated: ${data.type} v${data.version}`,
    });

    return doc;
  }

  async publishDocument(type: LegalDocumentType, adminId: string) {
    const doc = await prisma.legalDocument.update({
      where: { type },
      data: { isPublished: true, publishedAt: new Date(), publishedBy: adminId },
    });

    await audit({
      actorUserId: adminId, actorRole: 'admin',
      entityType: 'legal_document', entityId: doc.id,
      action: auditActions.ADMIN_LEGAL_PUBLISHED,
      description: `Legal document published: ${type} v${doc.version}`,
    });

    return doc;
  }
}

export const legalService = new LegalService();
