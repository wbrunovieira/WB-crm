-- Contact verification fields on Partner (email + phone/whatsapp format checks).
-- Mirrors the columns already on Lead/Contact. Additive, nullable, no backfill.
ALTER TABLE "partners" ADD COLUMN "emailVerified" BOOLEAN DEFAULT false;
ALTER TABLE "partners" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "partners" ADD COLUMN "emailVerificationStatus" TEXT;
ALTER TABLE "partners" ADD COLUMN "emailVerificationReason" TEXT;
ALTER TABLE "partners" ADD COLUMN "phoneValid" BOOLEAN;
ALTER TABLE "partners" ADD COLUMN "phoneType" TEXT;
ALTER TABLE "partners" ADD COLUMN "whatsappPhoneValid" BOOLEAN;
ALTER TABLE "partners" ADD COLUMN "whatsappPhoneType" TEXT;
