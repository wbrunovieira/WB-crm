ALTER TABLE "lead_contacts" ADD COLUMN IF NOT EXISTS "whatsappVerified" BOOLEAN DEFAULT false;
ALTER TABLE "lead_contacts" ADD COLUMN IF NOT EXISTS "whatsappVerifiedAt" TIMESTAMP(3);
ALTER TABLE "lead_contacts" ADD COLUMN IF NOT EXISTS "whatsappVerifiedNumber" TEXT;
ALTER TABLE "lead_contacts" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT false;
ALTER TABLE "lead_contacts" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "lead_contacts" ADD COLUMN IF NOT EXISTS "emailVerificationStatus" TEXT;
ALTER TABLE "lead_contacts" ADD COLUMN IF NOT EXISTS "emailVerificationReason" TEXT;
ALTER TABLE "lead_contacts" ADD COLUMN IF NOT EXISTS "phoneValid" BOOLEAN;
ALTER TABLE "lead_contacts" ADD COLUMN IF NOT EXISTS "phoneType" TEXT;
