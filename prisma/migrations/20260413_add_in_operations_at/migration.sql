-- Add inOperationsAt to leads and organizations for post-sale operations transfer
-- Add additionalDealIds to activities for multi-deal linking

ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "inOperationsAt" TIMESTAMP(3);
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "inOperationsAt" TIMESTAMP(3);
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "additionalDealIds" TEXT;

CREATE INDEX IF NOT EXISTS "leads_inOperationsAt_idx" ON "leads"("inOperationsAt");
CREATE INDEX IF NOT EXISTS "organizations_inOperationsAt_idx" ON "organizations"("inOperationsAt");
