-- AddColumn: gotoCallId to activities
-- Safe migration: nullable column added to existing table
-- Existing rows receive NULL — no data loss

ALTER TABLE "activities" ADD COLUMN "gotoCallId" TEXT;

CREATE UNIQUE INDEX "activities_gotoCallId_key" ON "activities"("gotoCallId")
  WHERE "gotoCallId" IS NOT NULL;

CREATE INDEX "activities_gotoCallId_idx" ON "activities"("gotoCallId");
