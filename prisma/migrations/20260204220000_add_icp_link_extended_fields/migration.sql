-- Add extended categorization fields to LeadICP
ALTER TABLE "lead_icps" ADD COLUMN "icpFitStatus" TEXT;
ALTER TABLE "lead_icps" ADD COLUMN "realDecisionMaker" TEXT;
ALTER TABLE "lead_icps" ADD COLUMN "realDecisionMakerOther" TEXT;
ALTER TABLE "lead_icps" ADD COLUMN "perceivedUrgency" INTEGER;
ALTER TABLE "lead_icps" ADD COLUMN "businessMoment" TEXT;
ALTER TABLE "lead_icps" ADD COLUMN "currentPlatforms" TEXT;
ALTER TABLE "lead_icps" ADD COLUMN "fragmentationLevel" INTEGER;
ALTER TABLE "lead_icps" ADD COLUMN "mainDeclaredPain" TEXT;
ALTER TABLE "lead_icps" ADD COLUMN "strategicDesire" TEXT;
ALTER TABLE "lead_icps" ADD COLUMN "perceivedTechnicalComplexity" INTEGER;
ALTER TABLE "lead_icps" ADD COLUMN "purchaseTrigger" TEXT;
ALTER TABLE "lead_icps" ADD COLUMN "nonClosingReason" TEXT;
ALTER TABLE "lead_icps" ADD COLUMN "estimatedDecisionTime" TEXT;
ALTER TABLE "lead_icps" ADD COLUMN "expansionPotential" INTEGER;

-- Add extended categorization fields to OrganizationICP
ALTER TABLE "organization_icps" ADD COLUMN "icpFitStatus" TEXT;
ALTER TABLE "organization_icps" ADD COLUMN "realDecisionMaker" TEXT;
ALTER TABLE "organization_icps" ADD COLUMN "realDecisionMakerOther" TEXT;
ALTER TABLE "organization_icps" ADD COLUMN "perceivedUrgency" INTEGER;
ALTER TABLE "organization_icps" ADD COLUMN "businessMoment" TEXT;
ALTER TABLE "organization_icps" ADD COLUMN "currentPlatforms" TEXT;
ALTER TABLE "organization_icps" ADD COLUMN "fragmentationLevel" INTEGER;
ALTER TABLE "organization_icps" ADD COLUMN "mainDeclaredPain" TEXT;
ALTER TABLE "organization_icps" ADD COLUMN "strategicDesire" TEXT;
ALTER TABLE "organization_icps" ADD COLUMN "perceivedTechnicalComplexity" INTEGER;
ALTER TABLE "organization_icps" ADD COLUMN "purchaseTrigger" TEXT;
ALTER TABLE "organization_icps" ADD COLUMN "nonClosingReason" TEXT;
ALTER TABLE "organization_icps" ADD COLUMN "estimatedDecisionTime" TEXT;
ALTER TABLE "organization_icps" ADD COLUMN "expansionPotential" INTEGER;

-- Create indexes for common filters
CREATE INDEX "lead_icps_icpFitStatus_idx" ON "lead_icps"("icpFitStatus");
CREATE INDEX "lead_icps_businessMoment_idx" ON "lead_icps"("businessMoment");
CREATE INDEX "organization_icps_icpFitStatus_idx" ON "organization_icps"("icpFitStatus");
CREATE INDEX "organization_icps_businessMoment_idx" ON "organization_icps"("businessMoment");
