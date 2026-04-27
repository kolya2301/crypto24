-- CreateEnum
CREATE TYPE "AccountingPeriodType" AS ENUM ('monthly', 'bimonthly', 'quarterly', 'annual');

-- CreateEnum
CREATE TYPE "AccountingPeriodStatus" AS ENUM ('open', 'locked', 'filed');

-- CreateTable
CREATE TABLE "AccountingPeriod" (
    "id" TEXT NOT NULL,
    "type" "AccountingPeriodType" NOT NULL DEFAULT 'bimonthly',
    "status" "AccountingPeriodStatus" NOT NULL DEFAULT 'open',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "label" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "filedAt" TIMESTAMP(3),
    "filedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VatReport" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "grossRevenueIls" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "spreadRevenueIls" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vatOnRevenueIls" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vatRatePercent" DECIMAL(5,2) NOT NULL DEFAULT 17,
    "inputVatIls" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vatPayableIls" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "buyOrders" INTEGER NOT NULL DEFAULT 0,
    "sellOrders" INTEGER NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT,

    CONSTRAINT "VatReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL,
    "asset" "CryptoCurrency" NOT NULL,
    "fiatCurrency" "FiatCurrency" NOT NULL DEFAULT 'ILS',
    "priceIls" DECIMAL(18,8) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'coingecko',
    "snapshotAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CryptoInventoryLot" (
    "id" TEXT NOT NULL,
    "asset" "CryptoCurrency" NOT NULL,
    "orderId" TEXT NOT NULL,
    "cryptoAmount" DECIMAL(18,8) NOT NULL,
    "costBasisIls" DECIMAL(18,2) NOT NULL,
    "costPerUnit" DECIMAL(18,8) NOT NULL,
    "remainingAmount" DECIMAL(18,8) NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CryptoInventoryLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealizedGainRecord" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "asset" "CryptoCurrency" NOT NULL,
    "cryptoSold" DECIMAL(18,8) NOT NULL,
    "proceedsIls" DECIMAL(18,2) NOT NULL,
    "costBasisIls" DECIMAL(18,2) NOT NULL,
    "gainLossIls" DECIMAL(18,2) NOT NULL,
    "isGain" BOOLEAN NOT NULL,
    "lots" TEXT NOT NULL,
    "realizedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RealizedGainRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountingPeriod_startDate_idx" ON "AccountingPeriod"("startDate");

-- CreateIndex
CREATE INDEX "AccountingPeriod_status_idx" ON "AccountingPeriod"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VatReport_periodId_key" ON "VatReport"("periodId");

-- CreateIndex
CREATE INDEX "PriceSnapshot_asset_snapshotAt_idx" ON "PriceSnapshot"("asset", "snapshotAt");

-- CreateIndex
CREATE UNIQUE INDEX "PriceSnapshot_asset_fiatCurrency_snapshotAt_key" ON "PriceSnapshot"("asset", "fiatCurrency", "snapshotAt");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoInventoryLot_orderId_key" ON "CryptoInventoryLot"("orderId");

-- CreateIndex
CREATE INDEX "CryptoInventoryLot_asset_acquiredAt_idx" ON "CryptoInventoryLot"("asset", "acquiredAt");

-- CreateIndex
CREATE UNIQUE INDEX "RealizedGainRecord_orderId_key" ON "RealizedGainRecord"("orderId");

-- CreateIndex
CREATE INDEX "RealizedGainRecord_asset_realizedAt_idx" ON "RealizedGainRecord"("asset", "realizedAt");

-- CreateIndex
CREATE INDEX "RealizedGainRecord_realizedAt_idx" ON "RealizedGainRecord"("realizedAt");

-- AddForeignKey
ALTER TABLE "VatReport" ADD CONSTRAINT "VatReport_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AccountingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
