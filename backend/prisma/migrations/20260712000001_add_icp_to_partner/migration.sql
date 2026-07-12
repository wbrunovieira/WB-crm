-- Partner ICP link (qualification), mirroring OrganizationICP. Additive: new table only.
CREATE TABLE "partner_icps" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "icpId" TEXT NOT NULL,
    "matchScore" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "icpFitStatus" TEXT,
    "realDecisionMaker" TEXT,
    "realDecisionMakerOther" TEXT,
    "perceivedUrgency" TEXT,
    "businessMoment" TEXT,
    "currentPlatforms" TEXT,
    "fragmentationLevel" INTEGER,
    "mainDeclaredPain" TEXT,
    "strategicDesire" TEXT,
    "perceivedTechnicalComplexity" INTEGER,
    "purchaseTrigger" TEXT,
    "nonClosingReason" TEXT,
    "estimatedDecisionTime" TEXT,
    "expansionPotential" INTEGER,
    CONSTRAINT "partner_icps_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "partner_icps_partnerId_icpId_key" ON "partner_icps"("partnerId", "icpId");
CREATE INDEX "partner_icps_partnerId_idx" ON "partner_icps"("partnerId");
CREATE INDEX "partner_icps_icpId_idx" ON "partner_icps"("icpId");
CREATE INDEX "partner_icps_icpFitStatus_idx" ON "partner_icps"("icpFitStatus");
CREATE INDEX "partner_icps_businessMoment_idx" ON "partner_icps"("businessMoment");
ALTER TABLE "partner_icps" ADD CONSTRAINT "partner_icps_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_icps" ADD CONSTRAINT "partner_icps_icpId_fkey" FOREIGN KEY ("icpId") REFERENCES "icps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
