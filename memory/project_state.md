---
name: CryptoChange Project State
description: What's been built and what still needs work in the CryptoChange crypto exchange platform
type: project
---

CryptoChange is a regulated Israeli crypto exchange (Next.js 14, TypeScript, Prisma, PostgreSQL, Redis, Tailwind).

**Completed (April 2026):**
- Real PayBox Business API integration (src/lib/providers/paybox.provider.ts)
- Real BIT Business API integration (src/lib/providers/bit.provider.ts)
- Webhook handlers for both (src/app/api/webhooks/paybox/route.ts, bit/route.ts)
- Live rates via CoinGecko + Redis caching (src/lib/services/rates.service.ts)
- Public rates API endpoint (src/app/api/rates/route.ts)
- Full frontend: landing page, exchange widget, login, register, dashboard, order detail, order creation flow, KYC form, wallets page
- tsconfig.json created (was missing)
- All TypeScript errors resolved (0 errors)

**Still needed:**
- Admin panel frontend pages (src/app/(admin)/[locale]/ is empty)
- Database migration + prisma generate (no DB running locally)
- Email notifications implementation (SMTP configured but not used)
- Sanctions screening real integration (currently stub)
- KYC document upload UI (form exists but no file upload)
- Real deployment/environment setup (all API keys are empty in .env.example)
- tailwindcss-animate plugin (required by tailwind.config.ts)

**Why:** PayBox/BIT require business onboarding; credentials must be set in .env before live payments work.
**How to apply:** When user asks about payments or deployment, remind them to fill in PAYBOX_MERCHANT_ID, PAYBOX_API_KEY, BIT_MERCHANT_ID, BIT_API_KEY and run `prisma generate && prisma migrate dev`.
