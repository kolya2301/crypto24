---
name: CryptoChange Tech Stack
description: Core technology stack for the CryptoChange crypto exchange project
type: project
---

- Framework: Next.js 14.1 App Router + TypeScript strict mode
- DB: PostgreSQL via Prisma ORM (schema at prisma/schema.prisma)
- Cache: Redis (via getRedis() async function from src/lib/redis.ts — NOT a named export `redis`)
- Auth: JWT via jose, cookie name `cc_session`, 8h expiry
- Payments: PayBox Business API + BIT Business API (both require merchant credentials)
- Webhooks: HMAC-SHA256 via PAYBOX_SECRET / BIT_SECRET env vars
- Rates: CoinGecko (default) / Binance / manual — controlled by RATE_SOURCE env var
- i18n: next-intl v3.5.4, locales: he (Hebrew, RTL) + ru (Russian, LTR)
- Storage: Cloudflare R2 / AWS S3 for KYC documents
- UI: Tailwind CSS + Radix UI + class-variance-authority, dark theme (CSS vars in globals.css)
