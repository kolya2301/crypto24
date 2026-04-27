import { NextRequest } from 'next/server';
import { getSessionFromRequest, isFinanceOrAdmin } from '@/lib/auth';
import { ok, unauthorized, forbidden, badRequest } from '@/lib/api-response';
import { accountingService } from '@/lib/services/accounting.service';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();
  if (!isFinanceOrAdmin(session)) return forbidden();

  const { searchParams } = new URL(req.url);
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');

  if (!startParam || !endParam) return badRequest('start and end date required');

  const startDate = new Date(startParam);
  const endDate = new Date(endParam);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return badRequest('invalid dates');

  endDate.setHours(23, 59, 59, 999);

  const summary = await accountingService.getPnLSummary(startDate, endDate);
  return ok(summary);
}
