import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSessionFromRequest } from '@/lib/auth';
import { ordersService } from '@/lib/services/orders.service';
import { ok, created, err, unauthorized, validationError, serverError } from '@/lib/api-response';
import { CryptoCurrency, FiatCurrency, OrderType, PaymentMethod } from '@prisma/client';

const createSchema = z.object({
  direction: z.nativeEnum(OrderType),
  asset: z.nativeEnum(CryptoCurrency),
  fiatCurrency: z.nativeEnum(FiatCurrency),
  paymentMethod: z.nativeEnum(PaymentMethod),
  quoteId: z.string().cuid(),
  walletId: z.string().cuid().optional(),
  legalAcknowledged: z.literal(true, {
    errorMap: () => ({ message: 'You must acknowledge the legal terms before submitting' }),
  }),
});

// POST /api/orders — create draft order
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return validationError('Validation failed', parsed.error.flatten());

    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    const order = await ordersService.create(session.sub, parsed.data, ip);
    return created(order);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'LEGAL_ACKNOWLEDGMENT_REQUIRED') return err('Legal acknowledgment is required', 422);
    if (msg === 'QUOTE_EXPIRED') return err('Quote has expired. Please generate a new quote.', 400);
    if (msg === 'QUOTE_NOT_FOUND') return err('Quote not found', 404);
    if (msg === 'WALLET_NOT_FOUND') return err('Wallet not found', 404);
    if (msg === 'WALLET_NOT_VERIFIED') return err('Wallet address has not been verified yet', 422);
    return serverError();
  }
}

// GET /api/orders — list user orders
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();

  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10);
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10), 100);

  const result = await ordersService.getUserOrders(session.sub, page, limit);
  return ok(result);
}
