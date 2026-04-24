-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('visitor', 'registered_user', 'compliance_officer', 'finance_operator', 'admin');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'pending_verification', 'deactivated');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('not_submitted', 'pending_review', 'approved', 'rejected', 'expired', 'more_info_required');

-- CreateEnum
CREATE TYPE "KycLevel" AS ENUM ('none', 'basic', 'enhanced', 'full');

-- CreateEnum
CREATE TYPE "KycDocumentType" AS ENUM ('id_front', 'id_back', 'passport', 'selfie', 'proof_of_address', 'source_of_funds', 'corporate_docs', 'other');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('buy', 'sell');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('draft', 'submitted', 'pending_kyc', 'pending_review', 'awaiting_payment', 'payment_received', 'awaiting_crypto', 'crypto_received', 'payout_in_progress', 'completed', 'rejected', 'cancelled', 'on_hold', 'expired');

-- CreateEnum
CREATE TYPE "CryptoCurrency" AS ENUM ('BTC', 'ETH', 'USDT', 'USDT_TRC20', 'USDC', 'SOL', 'LTC', 'XMR');

-- CreateEnum
CREATE TYPE "FiatCurrency" AS ENUM ('ILS', 'USD', 'EUR');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BIT', 'PAYBOX', 'CRYPTO_ONLY', 'MANUAL_BANK_OPTION_DISABLED_BY_DEFAULT');

-- CreateEnum
CREATE TYPE "PaymentMethodStatus" AS ENUM ('active', 'disabled', 'pending_approval');

-- CreateEnum
CREATE TYPE "WalletVerificationStatus" AS ENUM ('unverified', 'pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "PaymentRecordStatus" AS ENUM ('pending', 'confirmed', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "LegalDocumentType" AS ENUM ('terms_of_service', 'aml_kyc_policy', 'privacy_policy', 'risk_disclosure', 'refund_cancellation_policy', 'complaints_policy', 'cookie_policy', 'supported_payment_methods_policy');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('order_status_change', 'kyc_status_change', 'document_requested', 'payment_received', 'payout_sent', 'security_alert', 'system_message');

-- CreateEnum
CREATE TYPE "CrmClientStatus" AS ENUM ('lead', 'active', 'vip', 'inactive', 'blocked');

-- CreateEnum
CREATE TYPE "CrmDealStage" AS ENUM ('new', 'contacted', 'quote_sent', 'negotiating', 'kyc_pending', 'payment_pending', 'completed', 'lost');

-- CreateEnum
CREATE TYPE "CrmActivityType" AS ENUM ('note', 'call', 'email', 'order_created', 'order_completed', 'kyc_approved', 'status_changed');

-- CreateEnum
CREATE TYPE "CrmTaskStatus" AS ENUM ('pending', 'in_progress', 'done', 'cancelled');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "residencyCountry" TEXT NOT NULL DEFAULT 'IL',
    "role" "UserRole" NOT NULL DEFAULT 'registered_user',
    "status" "UserStatus" NOT NULL DEFAULT 'pending_verification',
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "KycStatus" NOT NULL DEFAULT 'not_submitted',
    "level" "KycLevel" NOT NULL DEFAULT 'none',
    "dateOfBirth" TIMESTAMP(3),
    "idNumber" TEXT,
    "idType" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "pepFlag" BOOLEAN NOT NULL DEFAULT false,
    "sanctionsFlag" BOOLEAN NOT NULL DEFAULT false,
    "sanctionsCheckedAt" TIMESTAMP(3),
    "sourceOfFundsStatus" TEXT,
    "sourceOfFundsNote" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "internalNotes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentType" "KycDocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewerNote" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KycDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "asset" "CryptoCurrency" NOT NULL,
    "address" TEXT NOT NULL,
    "label" TEXT,
    "network" TEXT NOT NULL DEFAULT 'mainnet',
    "verificationStatus" "WalletVerificationStatus" NOT NULL DEFAULT 'unverified',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "isCompanyWallet" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "direction" "OrderType" NOT NULL,
    "cryptoCurrency" "CryptoCurrency" NOT NULL,
    "fiatCurrency" "FiatCurrency" NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "cryptoAmount" DECIMAL(18,8) NOT NULL,
    "fiatAmount" DECIMAL(18,2) NOT NULL,
    "feeAmount" DECIMAL(18,2) NOT NULL,
    "feePercent" DECIMAL(5,2) NOT NULL,
    "spreadPercent" DECIMAL(5,2) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "isExpired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "OrderType" NOT NULL,
    "asset" "CryptoCurrency" NOT NULL,
    "fiatCurrency" "FiatCurrency" NOT NULL,
    "fiatAmount" DECIMAL(18,2) NOT NULL,
    "cryptoAmount" DECIMAL(18,8) NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "spread" DECIMAL(5,2) NOT NULL,
    "feeAmount" DECIMAL(18,2) NOT NULL,
    "quoteId" TEXT,
    "quoteExpiresAt" TIMESTAMP(3),
    "paymentMethodRequested" "PaymentMethod" NOT NULL,
    "paymentMethodApproved" "PaymentMethod",
    "walletId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'draft',
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "complianceNotes" TEXT,
    "rejectionReason" TEXT,
    "onHoldReason" TEXT,
    "kycApproved" BOOLEAN NOT NULL DEFAULT false,
    "sanctionsCleared" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethodEligible" BOOLEAN NOT NULL DEFAULT false,
    "walletValidated" BOOLEAN NOT NULL DEFAULT false,
    "quoteValid" BOOLEAN NOT NULL DEFAULT false,
    "legalAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "provider" TEXT NOT NULL,
    "providerReference" TEXT,
    "amount" DECIMAL(18,8) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PaymentRecordStatus" NOT NULL DEFAULT 'pending',
    "confirmedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethodConfig" (
    "id" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentMethodStatus" NOT NULL DEFAULT 'active',
    "displayNameHe" TEXT NOT NULL,
    "displayNameRu" TEXT NOT NULL,
    "minAmountIls" DECIMAL(18,2) NOT NULL DEFAULT 200,
    "maxAmountIls" DECIMAL(18,2) NOT NULL DEFAULT 50000,
    "allowedForBuy" BOOLEAN NOT NULL DEFAULT true,
    "allowedForSell" BOOLEAN NOT NULL DEFAULT true,
    "requiresKycLevel" "KycLevel" NOT NULL DEFAULT 'basic',
    "requiresManualApproval" BOOLEAN NOT NULL DEFAULT true,
    "maxRiskScore" INTEGER NOT NULL DEFAULT 70,
    "allowedAssets" TEXT,
    "providerConfig" TEXT NOT NULL DEFAULT '{}',
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethodConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateConfig" (
    "id" TEXT NOT NULL,
    "asset" "CryptoCurrency" NOT NULL,
    "fiatCurrency" "FiatCurrency" NOT NULL,
    "spreadPercent" DECIMAL(5,2) NOT NULL DEFAULT 1.5,
    "feePercent" DECIMAL(5,2) NOT NULL DEFAULT 0.5,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "manualRate" DECIMAL(18,8),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalDocument" (
    "id" TEXT NOT NULL,
    "type" "LegalDocumentType" NOT NULL,
    "titleHe" TEXT NOT NULL,
    "titleRu" TEXT NOT NULL,
    "contentHe" TEXT NOT NULL,
    "contentRu" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "documentId" TEXT NOT NULL,
    "documentType" "LegalDocumentType" NOT NULL,
    "documentVersion" TEXT NOT NULL,
    "contentSnapshot" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'he',

    CONSTRAINT "LegalAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRole" TEXT,
    "subjectUserId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "orderId" TEXT,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "country" TEXT,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" "NotificationType" NOT NULL,
    "titleHe" TEXT NOT NULL,
    "titleRu" TEXT NOT NULL,
    "bodyHe" TEXT NOT NULL,
    "bodyRu" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyWallet" (
    "id" TEXT NOT NULL,
    "asset" "CryptoCurrency" NOT NULL,
    "address" TEXT NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'mainnet',
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "addedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmClient" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedTo" TEXT,
    "status" "CrmClientStatus" NOT NULL DEFAULT 'lead',
    "tags" TEXT,
    "internalNotes" TEXT,
    "totalVolume" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "avgOrderSize" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3),
    "firstDealAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmDeal" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "orderId" TEXT,
    "assignedTo" TEXT,
    "title" TEXT NOT NULL,
    "stage" "CrmDealStage" NOT NULL DEFAULT 'new',
    "asset" TEXT,
    "direction" TEXT,
    "estimatedAmount" DECIMAL(18,2),
    "currency" TEXT DEFAULT 'ILS',
    "probability" INTEGER NOT NULL DEFAULT 50,
    "expectedCloseDate" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "lostReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmDeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmActivity" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "dealId" TEXT,
    "actorId" TEXT,
    "type" "CrmActivityType" NOT NULL DEFAULT 'note',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "isAuto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmTask" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "dealId" TEXT,
    "assignedTo" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" "CrmTaskStatus" NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "KycProfile_userId_key" ON "KycProfile"("userId");

-- CreateIndex
CREATE INDEX "KycProfile_status_idx" ON "KycProfile"("status");

-- CreateIndex
CREATE INDEX "KycProfile_sanctionsFlag_idx" ON "KycProfile"("sanctionsFlag");

-- CreateIndex
CREATE INDEX "KycDocument_userId_idx" ON "KycDocument"("userId");

-- CreateIndex
CREATE INDEX "KycDocument_status_idx" ON "KycDocument"("status");

-- CreateIndex
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "Wallet_isCompanyWallet_asset_idx" ON "Wallet"("isCompanyWallet", "asset");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_address_asset_key" ON "Wallet"("userId", "address", "asset");

-- CreateIndex
CREATE INDEX "Quote_userId_idx" ON "Quote"("userId");

-- CreateIndex
CREATE INDEX "Quote_expiresAt_idx" ON "Quote"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_quoteId_key" ON "Order"("quoteId");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_type_status_idx" ON "Order"("type", "status");

-- CreateIndex
CREATE INDEX "PaymentRecord_orderId_idx" ON "PaymentRecord"("orderId");

-- CreateIndex
CREATE INDEX "PaymentRecord_providerReference_idx" ON "PaymentRecord"("providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethodConfig_method_key" ON "PaymentMethodConfig"("method");

-- CreateIndex
CREATE UNIQUE INDEX "RateConfig_asset_fiatCurrency_key" ON "RateConfig"("asset", "fiatCurrency");

-- CreateIndex
CREATE UNIQUE INDEX "LegalDocument_type_key" ON "LegalDocument"("type");

-- CreateIndex
CREATE INDEX "LegalAcceptance_userId_idx" ON "LegalAcceptance"("userId");

-- CreateIndex
CREATE INDEX "LegalAcceptance_orderId_idx" ON "LegalAcceptance"("orderId");

-- CreateIndex
CREATE INDEX "LegalAcceptance_documentType_idx" ON "LegalAcceptance"("documentType");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_subjectUserId_idx" ON "AuditLog"("subjectUserId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "SessionLog_userId_idx" ON "SessionLog"("userId");

-- CreateIndex
CREATE INDEX "SessionLog_createdAt_idx" ON "SessionLog"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyWallet_asset_address_key" ON "CompanyWallet"("asset", "address");

-- CreateIndex
CREATE UNIQUE INDEX "CrmClient_userId_key" ON "CrmClient"("userId");

-- CreateIndex
CREATE INDEX "CrmClient_status_idx" ON "CrmClient"("status");

-- CreateIndex
CREATE INDEX "CrmClient_assignedTo_idx" ON "CrmClient"("assignedTo");

-- CreateIndex
CREATE INDEX "CrmClient_totalVolume_idx" ON "CrmClient"("totalVolume");

-- CreateIndex
CREATE INDEX "CrmDeal_clientId_idx" ON "CrmDeal"("clientId");

-- CreateIndex
CREATE INDEX "CrmDeal_stage_idx" ON "CrmDeal"("stage");

-- CreateIndex
CREATE INDEX "CrmDeal_assignedTo_idx" ON "CrmDeal"("assignedTo");

-- CreateIndex
CREATE INDEX "CrmDeal_createdAt_idx" ON "CrmDeal"("createdAt");

-- CreateIndex
CREATE INDEX "CrmActivity_clientId_idx" ON "CrmActivity"("clientId");

-- CreateIndex
CREATE INDEX "CrmActivity_dealId_idx" ON "CrmActivity"("dealId");

-- CreateIndex
CREATE INDEX "CrmActivity_createdAt_idx" ON "CrmActivity"("createdAt");

-- CreateIndex
CREATE INDEX "CrmTask_assignedTo_status_idx" ON "CrmTask"("assignedTo", "status");

-- CreateIndex
CREATE INDEX "CrmTask_dueAt_idx" ON "CrmTask"("dueAt");

-- AddForeignKey
ALTER TABLE "KycProfile" ADD CONSTRAINT "KycProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LegalDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionLog" ADD CONSTRAINT "SessionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmClient" ADD CONSTRAINT "CrmClient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmDeal" ADD CONSTRAINT "CrmDeal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "CrmClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "CrmClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "CrmDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
