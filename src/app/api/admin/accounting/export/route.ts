import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isFinanceOrAdmin } from '@/lib/auth';
import { unauthorized, forbidden, badRequest } from '@/lib/api-response';
import { accountingService } from '@/lib/services/accounting.service';

// GET /api/admin/accounting/export?start=...&end=...&format=csv|json
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();
  if (!isFinanceOrAdmin(session)) return forbidden();

  const { searchParams } = new URL(req.url);
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');
  const format = searchParams.get('format') ?? 'csv';

  if (!startParam || !endParam) return badRequest('start and end date required');

  const startDate = new Date(startParam);
  const endDate = new Date(endParam);
  endDate.setHours(23, 59, 59, 999);

  const rows = await accountingService.getAccountantExport(startDate, endDate);

  if (format === 'json') {
    return NextResponse.json({ rows });
  }

  // CSV output
  const headers = [
    'תאריך', 'מזהה הזמנה', 'סוג', 'מטבע', 'כמות קריפטו',
    'שער ₪', 'סכום ₪', 'עמלה ₪', 'ספרד %', 'מע"מ ₪',
    'רווח/הפסד ממומש ₪', 'לקוח',
  ];

  const csvRows = rows.map(r => [
    r.date, r.orderId, r.type, r.asset,
    r.cryptoAmount, r.rateIls, r.fiatAmountIls,
    r.feeIls, r.spreadPct, r.vatIls,
    r.realizedGainLoss ?? '', r.customer,
  ].join(','));

  const csv = '﻿' + [headers.join(','), ...csvRows].join('\n'); // BOM for Excel Hebrew

  const filename = `accounting_${startParam}_${endParam}.csv`;
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
