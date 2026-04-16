-- Add openingHours field to Lead (JSON string with weekday descriptions from Google Places)
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "openingHours" TEXT;
