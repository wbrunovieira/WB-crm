ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "sourceGroup" VARCHAR(100);
CREATE INDEX IF NOT EXISTS "leads_sourceGroup_idx" ON "leads"("sourceGroup");
