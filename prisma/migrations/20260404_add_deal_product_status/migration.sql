-- AlterTable: Add soft-delete status to deal_products
ALTER TABLE "deal_products" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "deal_products" ADD COLUMN IF NOT EXISTS "removedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "deal_products_status_idx" ON "deal_products"("status");
