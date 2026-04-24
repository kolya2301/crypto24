# CryptoChange - Crypto Trading Platform

A comprehensive cryptocurrency trading platform with KYC verification, admin controls, and multi-language support (Hebrew & Russian).

## Setup

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 16
- Redis 7

### Quick Start

1. **Clone the repository**
```bash
git clone <repo-url>
cd cryptoChange
```

2. **Install dependencies**
```bash
npm install
```

3. **Start infrastructure**
```bash
docker-compose up -d
```

This starts:
- PostgreSQL on `5432`
- Redis on `6379`
- pgAdmin on `5050` (admin@cryptochange.local / admin123)

4. **Setup database**
```bash
npx prisma migrate dev --name init
```

5. **Seed database**
```bash
npm run db:seed
```

Seeds:
- Admin user (admin@cryptochange.local / admin123)
- Payment method configurations (Bit, Paybox, Crypto-only)
- Rate configs for 8 assets × 3 fiat pairs
- Legal documents (Terms, Privacy, etc.)

6. **Start dev server**
```bash
npm run dev
```

Server runs on `http://localhost:3000`

## Accessing the App

### User Login
- URL: `/he/login` or `/ru/login`
- Create a new account via registration

### Admin Dashboard
- URL: `/he/admin` or `/ru/admin`
- Email: `admin@cryptochange.local`
- Password: `admin123`

### Admin Sub-pages
- **KYC Review**: `/admin/kyc` - Approve/reject pending KYC profiles
- **Audit Log**: `/admin/audit` - Search immutable audit trail
- **Rates & Fees**: `/admin/rates` - View/manage cryptocurrency rates and spreads
- **Wallet Verification**: `/admin/wallets` - Verify user crypto wallets

### User Dashboard
- **Home**: `/he/dashboard` - Orders and KYC status
- **Notifications**: `/notifications` - Read alerts and status updates
- **Payment Methods**: `/payment-methods` - View available payment options
- **Settings**: `/settings` - Update profile, password, language preferences

## Database Schema

### Key Tables
- **User** - User accounts with roles (admin, compliance_officer, finance_operator, registered_user)
- **KycProfile** - KYC verification data with status tracking
- **Order** - Crypto trading orders with multi-stage approval workflow
- **Wallet** - User crypto wallets with verification status
- **RateConfig** - Admin-controlled spreads & fees per asset/fiat pair
- **PaymentMethodConfig** - Payment method settings and eligibility rules
- **AuditLog** - Immutable action log for compliance
- **Notification** - User notifications with read status

### Enums
- **UserRole**: visitor, registered_user, compliance_officer, finance_operator, admin
- **OrderStatus**: draft, submitted, pending_review, awaiting_payment, completed, rejected, etc.
- **KycStatus**: not_submitted, pending_review, approved, rejected, expired
- **WalletVerificationStatus**: unverified, pending, verified, rejected

## Development

### Available Commands
```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking

# Database
npm run db:generate      # Regenerate Prisma client
npm run db:migrate       # Create a new migration
npm run db:push          # Push schema to database (dev only)
npm run db:seed          # Seed database with initial data
npm run db:studio        # Open Prisma Studio (visual DB editor)
```

### Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Cache**: Redis
- **Storage**: AWS S3
- **Authentication**: Iron Session, JWT
- **i18n**: next-intl (Hebrew, Russian)
- **Validation**: Zod, React Hook Form

### Project Structure
```
src/
├── app/                 # Next.js app directory
│   ├── (dashboard)/     # Protected routes
│   │   ├── [locale]/    # i18n routing
│   │   │   ├── admin/   # Admin pages
│   │   │   └── user/    # User pages
│   │   └── api/         # API routes
├── lib/                 # Shared utilities
│   ├── auth.ts          # Session & auth helpers
│   ├── prisma.ts        # Prisma client
│   └── services/        # Business logic
└── messages/            # i18n translations
```

## Security Features

- ✓ **KYC Verification** - Multi-level identity verification
- ✓ **AML/CFT Compliance** - Sanctions screening, risk scoring
- ✓ **Audit Logging** - Immutable action trail for all operations
- ✓ **Session Management** - Secure Iron Session with encryption
- ✓ **Payment Verification** - Wallet whitelist and two-factor controls
- ✓ **Rate Limiting** - Redis-backed rate limiting (configured in routes)
- ✓ **HTTPS Only** - All traffic encrypted in production

## Environment Variables

Create `.env.local`:
```env
DATABASE_URL="postgresql://cryptochange:cryptochange_dev@localhost:5432/cryptochange_dev"
REDIS_URL="redis://localhost:6379"
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"
AWS_S3_BUCKET="your-bucket"
NEXTAUTH_SECRET="your-secret-key-min-32-chars"
NODE_ENV="development"
```

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Start the server:
```bash
npm run start
```

3. Configure environment:
- Set production DATABASE_URL
- Set production Redis URL
- Set AWS credentials
- Set NEXTAUTH_SECRET to a strong random value

## Support

For issues or questions, please create an issue in the repository.
