import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSessionFromRequest, isAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { audit, auditActions } from '@/lib/audit';
import { ok, unauthorized, forbidden, validationError, serverError } from '@/lib/api-response';
import { CryptoCurrency, FiatCurrency } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();
  const rates = await prisma.rateConfig.findMany({ orderBy: [{ asset: 'asc' }, { fiatCurrency: 'asc' }] });
  return ok(rates);
}

const upsertSchema = z.object({
  asset: z.nativeEnum(CryptoCurrency),
  fiatCurrency: z.nativeEnum(FiatCurrency),
  spreadPercent: z.number().min(0).max(20),
  feePercent: z.number().min(0).max(10),
  manualRate: z.number().positive().optional(),
  source: z.enum(['manual', 'coingecko', 'binance']).default('manual'),
  isActive: z.boolean().default(true),
});

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  try {
    const body = await req.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) return validationError('Validation failed', parsed.error.flatten());

    const { asset, fiatCurrency, spreadPercent, feePercent, manualRate, source, isActive } = parsed.data;

    const rate = await prisma.rateConfig.upsert({
      where: { asset_fiatCurrency: { asset, fiatCurrency } },
      create: {
        asset, fiatCurrency,
        spreadPercent: new Decimal(spreadPercent),
        feePercent: new Decimal(feePercent),
        manualRate: manualRate ? new Decimal(manualRate) : null,
        source, isActive,
        updatedBy: session.sub,
      },
      update: {
        spreadPercent: new Decimal(spreadPercent),
        feePercent: new Decimal(feePercent),
        manualRate: manualRate ? new Decimal(manualRate) : null,
        source, isActive,
        updatedBy: session.sub,
      },
    });

    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    await audit({
      actorUserId: session.sub, actorRole: 'admin',
      entityType: 'rate_config', entityId: `${asset}_${fiatCurrency}`,
      action: auditActions.ADMIN_RATE_CHANGED,
      description: `Rate updated: ${asset}/${fiatCurrency} spread=${spreadPercent}% fee=${feePercent}%`,
      afterJson: { asset, fiatCurrency, spreadPercent, feePercent, manualRate },
      ipAddress: ip,
    });

    return ok(rate);
  } catch {
    return serverError();
  }
}
