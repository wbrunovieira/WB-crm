-- Partner support for self-scheduling:
-- a booking link can target a Partner (not only a Lead/contact), and the
-- resulting Meeting links back to that Partner.

-- booking_links.partnerId (scalar + index; no FK, mirrors leadId/contactId)
ALTER TABLE "booking_links" ADD COLUMN "partnerId" TEXT;
CREATE INDEX "booking_links_partnerId_idx" ON "booking_links"("partnerId");

-- meetings.partnerId (scalar + index + FK to partners, ON DELETE SET NULL)
ALTER TABLE "meetings" ADD COLUMN "partnerId" TEXT;
CREATE INDEX "meetings_partnerId_idx" ON "meetings"("partnerId");
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
