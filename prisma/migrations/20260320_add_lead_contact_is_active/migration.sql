-- AlterTable
ALTER TABLE "lead_contacts" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
