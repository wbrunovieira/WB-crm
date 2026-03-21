-- Add activityOrder field to leads table for custom drag-and-drop ordering
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "activityOrder" TEXT;
