import { NextRequest } from 'next/server';
import { getSessionFromRequest, isFinanceOrAdmin } from '@/lib/auth';
import { ok, unauthorized, forbidden, badRequest } from '@/lib/api-response';
import { accountingService } from '@/lib/services/accounting.service';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();
  if (!isFinanceOrAdmin(session)) return forbidden();

  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get('year') ?? String(new Date().getFullYear());
  const year = parseInt(yearParam, 10);
  if (isNaN(year)) return badRequest('invalid year');

  const summary = await accountingService.getAnnualSummary(year);
  return ok(summary);
}
