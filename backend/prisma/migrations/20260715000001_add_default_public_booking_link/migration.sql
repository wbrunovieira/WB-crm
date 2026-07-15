-- Token-less /book URL: one booking link can be the default public one.
ALTER TABLE "booking_links" ADD COLUMN "isDefaultPublic" BOOLEAN NOT NULL DEFAULT false;
-- Partial UNIQUE index: at most one link may be the default public one, so the
-- token-less /book URL resolves deterministically (GET slots and POST create can
-- never land on different links/owners between calls).
CREATE UNIQUE INDEX "booking_links_isDefaultPublic_key" ON "booking_links"("isDefaultPublic") WHERE "isDefaultPublic";
