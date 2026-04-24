import { Redis } from '@upstash/redis';

// ─── In-memory fallback for local development (no Redis required) ─────────────
const memStore = new Map<string, { value: unknown; expiresAt?: number }>();

const memoryRedis = {
  async get<T>(key: string): Promise<T | null> {
    const entry = memStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) { memStore.delete(key); return null; }
    return entry.value as T;
  },
  async set(key: string, value: unknown, opts?: { ex?: number }): Promise<void> {
    memStore.set(key, { value, expiresAt: opts?.ex ? Date.now() + opts.ex * 1000 : undefined });
  },
  async del(key: string): Promise<void> { memStore.delete(key); },
  async incr(key: string): Promise<number> {
    const entry = memStore.get(key);
    const current = typeof entry?.value === 'number' ? entry.value : 0;
    const next = current + 1;
    memStore.set(key, { value: next, expiresAt: entry?.expiresAt });
    return next;
  },
  async expire(key: string, seconds: number): Promise<void> {
    const entry = memStore.get(key);
    if (entry) memStore.set(key, { ...entry, expiresAt: Date.now() + seconds * 1000 });
  },
};

// ─── Upstash Redis client (HTTP-based, works on Vercel serverless) ─────────────
let _upstash: Redis | null = null;

function getClient() {
  // Production / Vercel: use Upstash
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    if (!_upstash) {
      _upstash = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
    }
    return _upstash;
  }

  // Local dev: in-memory fallback (no Redis needed)
  return memoryRedis;
}

// ─── Public API (same as before — no other files need to change) ───────────────

export async function getRedis() {
  return getClient();
}

export async function redisGet<T>(key: string): Promise<T | null> {
  return getClient().get<T>(key);
}

export async function redisSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  await getClient().set(key, value, ttlSeconds ? { ex: ttlSeconds } : undefined);
}

export async function redisDel(key: string): Promise<void> {
  await getClient().del(key);
}

// ─── Rate limiter ─────────────────────────────────────────────────────────────

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const client = getClient();
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `ratelimit:${key}:${Math.floor(now / windowSeconds)}`;

  const current = await client.incr(windowKey);
  if (current === 1) await client.expire(windowKey, windowSeconds);

  const resetAt = (Math.floor(now / windowSeconds) + 1) * windowSeconds;
  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
    resetAt,
  };
}

// ─── Quote cache ──────────────────────────────────────────────────────────────

export const QUOTE_CACHE_PREFIX = 'quote:';

export async function cacheQuote(quoteId: string, quoteData: unknown, ttlSeconds: number): Promise<void> {
  await redisSet(`${QUOTE_CACHE_PREFIX}${quoteId}`, quoteData, ttlSeconds);
}

export async function getCachedQuote<T>(quoteId: string): Promise<T | null> {
  return redisGet<T>(`${QUOTE_CACHE_PREFIX}${quoteId}`);
}

export async function invalidateQuote(quoteId: string): Promise<void> {
  await redisDel(`${QUOTE_CACHE_PREFIX}${quoteId}`);
}
