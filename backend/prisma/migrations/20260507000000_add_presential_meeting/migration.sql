-- AlterTable: add presential meeting fields to Meeting
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "isPresential" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "confirmationMethod" TEXT;
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "confirmationSentAt" TIMESTAMP(3);
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "uploadedAudioKey" TEXT;
