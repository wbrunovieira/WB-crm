-- AlterTable: add presential meeting fields to Meeting
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "isPresential" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "confirmationMethod" TEXT;
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "confirmationSentAt" TIMESTAMP(3);
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "uploadedAudioKey" TEXT;
