-- Add completedAt timestamp to track when activity was completed
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP;
