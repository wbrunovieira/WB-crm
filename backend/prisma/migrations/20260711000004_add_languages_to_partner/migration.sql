-- Spoken languages on Partner as JSON [{code, isPrimary}] (mirrors Lead.languages).
-- Additive, nullable, no backfill.
ALTER TABLE "partners" ADD COLUMN "languages" TEXT;
