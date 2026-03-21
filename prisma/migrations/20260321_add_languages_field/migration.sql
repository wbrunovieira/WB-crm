-- Add languages JSON field to leads, lead_contacts, organizations, and contacts
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "languages" TEXT;
ALTER TABLE "lead_contacts" ADD COLUMN IF NOT EXISTS "languages" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "languages" TEXT;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "languages" TEXT;
