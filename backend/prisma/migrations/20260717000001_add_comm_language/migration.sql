-- Communication language per entity (drives which localized campaign/newsletter version they get).
-- NOT NULL DEFAULT 'pt' backfills all existing rows to Portuguese.
ALTER TABLE "leads"          ADD COLUMN "commLanguage" TEXT NOT NULL DEFAULT 'pt';
ALTER TABLE "lead_contacts"  ADD COLUMN "commLanguage" TEXT NOT NULL DEFAULT 'pt';
ALTER TABLE "organizations"  ADD COLUMN "commLanguage" TEXT NOT NULL DEFAULT 'pt';
ALTER TABLE "contacts"       ADD COLUMN "commLanguage" TEXT NOT NULL DEFAULT 'pt';
ALTER TABLE "partners"       ADD COLUMN "commLanguage" TEXT NOT NULL DEFAULT 'pt';
