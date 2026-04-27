-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "emailVerified" BOOLEAN DEFAULT false;
ALTER TABLE "Lead" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN "emailVerificationStatus" TEXT;
ALTER TABLE "Lead" ADD COLUMN "emailVerificationReason" TEXT;
