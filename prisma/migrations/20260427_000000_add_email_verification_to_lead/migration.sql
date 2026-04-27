-- AlterTable
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT false;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "emailVerificationStatus" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "emailVerificationReason" TEXT;
