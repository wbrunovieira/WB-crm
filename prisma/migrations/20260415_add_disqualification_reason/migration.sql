-- Add disqualificationReason to lead_cadences
ALTER TABLE "lead_cadences" ADD COLUMN IF NOT EXISTS "disqualificationReason" TEXT;

-- Create disqualification_reasons table
CREATE TABLE IF NOT EXISTS "disqualification_reasons" (
  "id"        TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "ownerId"   TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "disqualification_reasons_pkey" PRIMARY KEY ("id")
);

-- Unique constraint and indexes
CREATE UNIQUE INDEX IF NOT EXISTS "disqualification_reasons_name_ownerId_key"
  ON "disqualification_reasons"("name", "ownerId");

CREATE INDEX IF NOT EXISTS "disqualification_reasons_ownerId_idx"
  ON "disqualification_reasons"("ownerId");

-- Foreign key (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'disqualification_reasons_ownerId_fkey'
  ) THEN
    ALTER TABLE "disqualification_reasons"
      ADD CONSTRAINT "disqualification_reasons_ownerId_fkey"
      FOREIGN KEY ("ownerId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
