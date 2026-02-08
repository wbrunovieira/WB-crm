-- Add linkedin and instagram fields to lead_contacts table
ALTER TABLE "lead_contacts" ADD COLUMN "linkedin" TEXT;
ALTER TABLE "lead_contacts" ADD COLUMN "instagram" TEXT;

-- Add instagram field to contacts table (linkedin already exists)
ALTER TABLE "contacts" ADD COLUMN "instagram" TEXT;
