-- Add outcome tracking fields to activities
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "failedAt" TIMESTAMP;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "failReason" TEXT;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "skippedAt" TIMESTAMP;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "skipReason" TEXT;
