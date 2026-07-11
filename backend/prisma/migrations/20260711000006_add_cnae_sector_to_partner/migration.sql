-- Economic activity (CNAE + Sector) on Partner, mirroring Lead/Organization.
-- Additive/nullable columns + two junction tables. No backfill.

-- Partner scalar columns
ALTER TABLE "partners" ADD COLUMN "primaryCNAEId" TEXT;
ALTER TABLE "partners" ADD COLUMN "internationalActivity" TEXT;
CREATE INDEX "partners_primaryCNAEId_idx" ON "partners"("primaryCNAEId");
ALTER TABLE "partners" ADD CONSTRAINT "partners_primaryCNAEId_fkey" FOREIGN KEY ("primaryCNAEId") REFERENCES "cnaes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- partner_secondary_cnaes junction
CREATE TABLE "partner_secondary_cnaes" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "cnaeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "partner_secondary_cnaes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "partner_secondary_cnaes_partnerId_cnaeId_key" ON "partner_secondary_cnaes"("partnerId", "cnaeId");
CREATE INDEX "partner_secondary_cnaes_partnerId_idx" ON "partner_secondary_cnaes"("partnerId");
CREATE INDEX "partner_secondary_cnaes_cnaeId_idx" ON "partner_secondary_cnaes"("cnaeId");
ALTER TABLE "partner_secondary_cnaes" ADD CONSTRAINT "partner_secondary_cnaes_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_secondary_cnaes" ADD CONSTRAINT "partner_secondary_cnaes_cnaeId_fkey" FOREIGN KEY ("cnaeId") REFERENCES "cnaes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- partner_sectors junction
CREATE TABLE "partner_sectors" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT NOT NULL,
    "sector_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "partner_sectors_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "partner_sectors_partner_id_sector_id_key" ON "partner_sectors"("partner_id", "sector_id");
CREATE INDEX "partner_sectors_partner_id_idx" ON "partner_sectors"("partner_id");
CREATE INDEX "partner_sectors_sector_id_idx" ON "partner_sectors"("sector_id");
ALTER TABLE "partner_sectors" ADD CONSTRAINT "partner_sectors_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_sectors" ADD CONSTRAINT "partner_sectors_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
