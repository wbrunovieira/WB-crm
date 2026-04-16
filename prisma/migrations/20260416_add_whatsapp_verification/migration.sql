-- Add WhatsApp verification fields to leads
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "whatsappVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "whatsappVerifiedAt" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "whatsappVerifiedNumber" TEXT;

-- Add WhatsApp verification fields to contacts
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "whatsappVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "whatsappVerifiedAt" TIMESTAMP(3);
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "whatsappVerifiedNumber" TEXT;
