-- Add isProspect flag to leads
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "isProspect" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "leads_isProspect_idx" ON "leads"("isProspect");
