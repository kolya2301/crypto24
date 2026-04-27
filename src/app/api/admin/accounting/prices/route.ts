import { NextRequest } from 'next/server';
import { getSessionFromRequest, isFinanceOrAdmin } from '@/lib/auth';
import { ok, unauthorized, forbidden, badRequest } from '@/lib/api-response';
import { accountingService } from '@/lib/services/accounting.service';
import { CryptoCurrency } from '@prisma/client';

// POST /api/admin/accounting/prices — save a manual price snapshot
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();
  if (!isFinanceOrAdmin(session)) return forbidden();

  const body = await req.json();
  const { asset, priceIls } = body;

  if (!asset || !priceIls) return badRequest('asset and priceIls required');
  if (!Object.values(CryptoCurrency).includes(asset)) return badRequest('invalid asset');
  if (typeof priceIls !== 'number' || priceIls <= 0) return badRequest('invalid price');

  const snapshot = await accountingService.savePrice(asset as CryptoCurrency, priceIls, 'manual');
  return ok({ snapshot });
}

// GET /api/admin/accounting/prices — list recent snapshots
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();
  if (!isFinanceOrAdmin(session)) return forbidden();

  const { searchParams } = new URL(req.url);
  const asset = searchParams.get('asset') as CryptoCurrency | null;

  const { prisma } = await import('@/lib/prisma');
  const snapshots = await prisma.priceSnapshot.findMany({
    where: asset ? { asset } : {},
    orderBy: { snapshotAt: 'desc' },
    take: 30,
  });

  return ok({ snapshots });
}
