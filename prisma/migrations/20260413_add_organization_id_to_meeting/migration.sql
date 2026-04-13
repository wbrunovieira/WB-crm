-- Add organizationId to Meeting model to support meetings linked to Organizations

ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

ALTER TABLE "meetings"
  ADD CONSTRAINT IF NOT EXISTS "meetings_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "meetings_organizationId_idx" ON "meetings"("organizationId");
