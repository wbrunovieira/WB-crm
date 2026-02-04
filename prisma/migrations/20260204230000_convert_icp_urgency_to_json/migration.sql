-- Convert perceivedUrgency from INT to TEXT and businessMoment to JSON array format
-- This migration handles PostgreSQL (production)

-- Step 1: Add temporary columns for the conversion
ALTER TABLE "lead_icps" ADD COLUMN "perceivedUrgency_new" TEXT;
ALTER TABLE "lead_icps" ADD COLUMN "businessMoment_new" TEXT;
ALTER TABLE "organization_icps" ADD COLUMN "perceivedUrgency_new" TEXT;
ALTER TABLE "organization_icps" ADD COLUMN "businessMoment_new" TEXT;

-- Step 2: Migrate data - Convert integer urgency to JSON array string
UPDATE "lead_icps" SET "perceivedUrgency_new" =
  CASE
    WHEN "perceivedUrgency" = 1 THEN '["curiosity"]'
    WHEN "perceivedUrgency" = 2 THEN '["interest"]'
    WHEN "perceivedUrgency" = 3 THEN '["future_need"]'
    WHEN "perceivedUrgency" = 4 THEN '["current_need"]'
    WHEN "perceivedUrgency" = 5 THEN '["active_pain"]'
    ELSE NULL
  END;

UPDATE "organization_icps" SET "perceivedUrgency_new" =
  CASE
    WHEN "perceivedUrgency" = 1 THEN '["curiosity"]'
    WHEN "perceivedUrgency" = 2 THEN '["interest"]'
    WHEN "perceivedUrgency" = 3 THEN '["future_need"]'
    WHEN "perceivedUrgency" = 4 THEN '["current_need"]'
    WHEN "perceivedUrgency" = 5 THEN '["active_pain"]'
    ELSE NULL
  END;

-- Step 3: Migrate businessMoment - Convert single value to JSON array
UPDATE "lead_icps" SET "businessMoment_new" =
  CASE
    WHEN "businessMoment" IS NOT NULL AND "businessMoment" != '' THEN '["' || "businessMoment" || '"]'
    ELSE NULL
  END;

UPDATE "organization_icps" SET "businessMoment_new" =
  CASE
    WHEN "businessMoment" IS NOT NULL AND "businessMoment" != '' THEN '["' || "businessMoment" || '"]'
    ELSE NULL
  END;

-- Step 4: Drop old columns
ALTER TABLE "lead_icps" DROP COLUMN "perceivedUrgency";
ALTER TABLE "lead_icps" DROP COLUMN "businessMoment";
ALTER TABLE "organization_icps" DROP COLUMN "perceivedUrgency";
ALTER TABLE "organization_icps" DROP COLUMN "businessMoment";

-- Step 5: Rename new columns to original names
ALTER TABLE "lead_icps" RENAME COLUMN "perceivedUrgency_new" TO "perceivedUrgency";
ALTER TABLE "lead_icps" RENAME COLUMN "businessMoment_new" TO "businessMoment";
ALTER TABLE "organization_icps" RENAME COLUMN "perceivedUrgency_new" TO "perceivedUrgency";
ALTER TABLE "organization_icps" RENAME COLUMN "businessMoment_new" TO "businessMoment";

-- Step 6: Recreate index on businessMoment (it was dropped with the column)
CREATE INDEX "lead_icps_businessMoment_idx" ON "lead_icps"("businessMoment");
CREATE INDEX "organization_icps_businessMoment_idx" ON "organization_icps"("businessMoment");
