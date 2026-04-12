-- Add actual start/end times to meetings (separate from scheduled times)
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "actualStartAt" TIMESTAMP(3);
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "actualEndAt" TIMESTAMP(3);
