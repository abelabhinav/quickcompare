-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "searchAliases" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "Offer_providerId_externalId_idx" ON "Offer"("providerId", "externalId");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_brand_idx" ON "Product"("brand");
