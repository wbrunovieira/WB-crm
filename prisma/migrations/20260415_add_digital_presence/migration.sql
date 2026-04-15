-- Add digital presence fields to leads
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "socialMedia" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "metaAds" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "googleAds" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "starRating" INTEGER;

-- Create lead_dropdown_options table for custom options
CREATE TABLE IF NOT EXISTS "lead_dropdown_options" (
  "id"        TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "category"  TEXT NOT NULL,
  "ownerId"   TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "lead_dropdown_options_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "lead_dropdown_options_name_category_owner_key"
  ON "lead_dropdown_options"("name", "category", "ownerId");

CREATE INDEX IF NOT EXISTS "lead_dropdown_options_category_owner_idx"
  ON "lead_dropdown_options"("category", "ownerId");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lead_dropdown_options_ownerId_fkey'
  ) THEN
    ALTER TABLE "lead_dropdown_options"
      ADD CONSTRAINT "lead_dropdown_options_ownerId_fkey"
      FOREIGN KEY ("ownerId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
