-- Add organizationId to Meeting model to support meetings linked to Organizations

ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'meetings_organizationId_fkey'
  ) THEN
    ALTER TABLE "meetings"
      ADD CONSTRAINT "meetings_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "meetings_organizationId_idx" ON "meetings"("organizationId");
