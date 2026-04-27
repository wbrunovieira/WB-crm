-- Add phone validation fields to leads table
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "phoneValid" BOOLEAN;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "phoneType" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "phone2Valid" BOOLEAN;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "phone2Type" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "whatsappPhoneValid" BOOLEAN;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "whatsappPhoneType" TEXT;

-- Add phone validation fields to contacts table
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "phoneValid" BOOLEAN;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "phoneType" TEXT;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "whatsappPhoneValid" BOOLEAN;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "whatsappPhoneType" TEXT;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT false;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "emailVerificationStatus" TEXT;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "emailVerificationReason" TEXT;
