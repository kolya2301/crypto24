import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSessionFromRequest } from '@/lib/auth';
import { quotesService } from '@/lib/services/quotes.service';
import { created, err, unauthorized, validationError, serverError } from '@/lib/api-response';
import { CryptoCurrency, FiatCurrency, OrderType } from '@prisma/client';
import { checkRateLimit } from '@/lib/redis';

const schema = z.object({
  direction: z.nativeEnum(OrderType),
  asset: z.nativeEnum(CryptoCurrency),
  fiatCurrency: z.nativeEnum(FiatCurrency),
  cryptoAmount: z.number().positive().optional(),
  fiatAmount: z.number().positive().optional(),
}).refine(d => d.cryptoAmount || d.fiatAmount, {
  message: 'Provide either cryptoAmount or fiatAmount',
});

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return unauthorized();

  // Rate limit: 30 quotes per minute
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const rl = await checkRateLimit(`quote:${session.sub}`, 30, 60);
  if (!rl.allowed) return err('Too many quote requests. Please wait.', 429);

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationError('Validation failed', parsed.error.flatten());

    const quote = await quotesService.generate({ userId: session.sub, ...parsed.data });
    return created(quote);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.startsWith('UNSUPPORTED_PAIR')) return err('This trading pair is not currently supported', 400);
    if (msg === 'INVALID_AMOUNT') return validationError('Provide either cryptoAmount or fiatAmount');
    return serverError();
  }
}
