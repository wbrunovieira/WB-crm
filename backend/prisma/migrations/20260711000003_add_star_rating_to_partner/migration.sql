-- Manual star rating (1–5) on Partner to prioritize partners (mirrors Lead.starRating).
-- Additive, nullable, no backfill.
ALTER TABLE "partners" ADD COLUMN "starRating" INTEGER;
