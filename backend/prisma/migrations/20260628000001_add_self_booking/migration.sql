-- Meeting: campos de auto-agendamento
ALTER TABLE "meetings" ADD COLUMN "manageToken" TEXT;
ALTER TABLE "meetings" ADD COLUMN "bookingLinkId" TEXT;
CREATE UNIQUE INDEX "meetings_manageToken_key" ON "meetings"("manageToken");

-- BookingType (config no admin)
CREATE TABLE "booking_types" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 30,
  "bufferMinutes" INTEGER NOT NULL DEFAULT 15,
  "minNoticeHours" INTEGER NOT NULL DEFAULT 4,
  "maxAdvanceDays" INTEGER NOT NULL DEFAULT 14,
  "timeZone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  "weeklyHours" TEXT NOT NULL DEFAULT '[]',
  "presentialCities" TEXT NOT NULL DEFAULT '[]',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "booking_types_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "booking_types_ownerId_slug_key" ON "booking_types"("ownerId", "slug");
CREATE INDEX "booking_types_ownerId_idx" ON "booking_types"("ownerId");

-- BookingLink (token público -> lead)
CREATE TABLE "booking_links" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "bookingTypeId" TEXT NOT NULL,
  "leadId" TEXT,
  "contactId" TEXT,
  "label" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "booking_links_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "booking_links_token_key" ON "booking_links"("token");
CREATE INDEX "booking_links_ownerId_idx" ON "booking_links"("ownerId");
CREATE INDEX "booking_links_leadId_idx" ON "booking_links"("leadId");
CREATE INDEX "booking_links_bookingTypeId_idx" ON "booking_links"("bookingTypeId");
