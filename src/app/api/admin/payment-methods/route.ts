import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSessionFromRequest, isAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { audit, auditActions } from '@/lib/audit';
import { ok, unauthorized, forbidden, validationError, serverError } from '@/lib/api-response';
import { PaymentMethod, PaymentMethodStatus, KycLevel } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();
  const configs = await prisma.paymentMethodConfig.findMany({ orderBy: { method: 'asc' } });
  return ok(configs);
}

const updateSchema = z.object({
  method: z.nativeEnum(PaymentMethod),
  status: z.nativeEnum(PaymentMethodStatus).optional(),
  minAmountIls: z.number().positive().optional(),
  maxAmountIls: z.number().positive().optional(),
  allowedForBuy: z.boolean().optional(),
  allowedForSell: z.boolean().optional(),
  requiresKycLevel: z.nativeEnum(KycLevel).optional(),
  requiresManualApproval: z.boolean().optional(),
  maxRiskScore: z.number().min(0).max(100).optional(),
  displayNameHe: z.string().optional(),
  displayNameRu: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return validationError('Validation failed', parsed.error.flatten());

    const { method, ...data } = parsed.data;
    const before = await prisma.paymentMethodConfig.findUnique({ where: { method } });

    const config = await prisma.paymentMethodConfig.upsert({
      where: { method },
      create: {
        method,
        displayNameHe: data.displayNameHe ?? method,
        displayNameRu: data.displayNameRu ?? method,
        ...data,
        updatedBy: session.sub,
      },
      update: { ...data, updatedBy: session.sub },
    });

    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    await audit({
      actorUserId: session.sub, actorRole: 'admin',
      entityType: 'payment_method', entityId: method,
      action: auditActions.ADMIN_PAYMENT_METHOD_TOGGLED,
      description: `Payment method ${method} config updated`,
      beforeJson: before, afterJson: config,
      ipAddress: ip,
    });

    return ok(config);
  } catch {
    return serverError();
  }
}
