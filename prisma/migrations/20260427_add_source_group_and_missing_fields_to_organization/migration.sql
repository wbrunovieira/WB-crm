ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "segment"         TEXT,
  ADD COLUMN IF NOT EXISTS "legalNature"     TEXT,
  ADD COLUMN IF NOT EXISTS "branchType"      TEXT,
  ADD COLUMN IF NOT EXISTS "simplesNacional" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "isMei"           BOOLEAN,
  ADD COLUMN IF NOT EXISTS "revenueRange"    TEXT,
  ADD COLUMN IF NOT EXISTS "phone2"          TEXT,
  ADD COLUMN IF NOT EXISTS "sourceGroup"     VARCHAR(100);

CREATE INDEX IF NOT EXISTS "organizations_sourceGroup_idx" ON "organizations"("sourceGroup");
