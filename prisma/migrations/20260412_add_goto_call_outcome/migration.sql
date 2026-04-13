-- Add gotoCallOutcome field to activities table
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "gotoCallOutcome" TEXT;
