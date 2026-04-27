import { NextRequest } from 'next/server';
import { getSessionFromRequest, isFinanceOrAdmin } from '@/lib/auth';
import { ok, unauthorized, forbidden, badRequest } from '@/lib/api-response';
import { accountingService } from '@/lib/services/accounting.service';

// GET /api/admin/accounting/vat — list periods with VAT reports
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();
  if (!isFinanceOrAdmin(session)) return forbidden();

  const periods = await accountingService.getPeriods(12);
  return ok({ periods });
}

// POST /api/admin/accounting/vat — generate/refresh VAT report for a period
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();
  if (!isFinanceOrAdmin(session)) return forbidden();

  const body = await req.json();
  if (!body.periodId) return badRequest('periodId required');

  const report = await accountingService.generateVatReport(body.periodId, session.sub);
  return ok({ report });
}
