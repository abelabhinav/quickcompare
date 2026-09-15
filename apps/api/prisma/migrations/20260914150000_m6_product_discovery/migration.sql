ALTER TABLE "Product"
ADD COLUMN "canonicalKey" TEXT,
ADD COLUMN "categorySlug" TEXT,
ADD COLUMN "subcategory" TEXT,
ADD COLUMN "subcategorySlug" TEXT,
ADD COLUMN "variant" TEXT,
ADD COLUMN "size" TEXT,
ADD COLUMN "unit" TEXT,
ADD COLUMN "description" TEXT;

CREATE UNIQUE INDEX "Product_canonicalKey_key" ON "Product"("canonicalKey");
CREATE INDEX "Product_categorySlug_idx" ON "Product"("categorySlug");
CREATE INDEX "Product_subcategorySlug_idx" ON "Product"("subcategorySlug");
