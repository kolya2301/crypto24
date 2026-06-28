-- CreateEnum
CREATE TYPE "AddressDerivationScheme" AS ENUM ('STATIC', 'BIP84_SEGWIT');

-- AlterTable
ALTER TABLE "CompanyWallet" ADD COLUMN     "derivationScheme" "AddressDerivationScheme" NOT NULL DEFAULT 'STATIC',
ADD COLUMN     "nextIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "xpub" TEXT;

-- CreateTable
CREATE TABLE "DerivedAddress" (
    "id" TEXT NOT NULL,
    "companyWalletId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "asset" "CryptoCurrency" NOT NULL,
    "derivationIndex" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DerivedAddress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DerivedAddress_orderId_key" ON "DerivedAddress"("orderId");

-- CreateIndex
CREATE INDEX "DerivedAddress_address_idx" ON "DerivedAddress"("address");

-- CreateIndex
CREATE UNIQUE INDEX "DerivedAddress_companyWalletId_derivationIndex_key" ON "DerivedAddress"("companyWalletId", "derivationIndex");

-- AddForeignKey
ALTER TABLE "DerivedAddress" ADD CONSTRAINT "DerivedAddress_companyWalletId_fkey" FOREIGN KEY ("companyWalletId") REFERENCES "CompanyWallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DerivedAddress" ADD CONSTRAINT "DerivedAddress_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
