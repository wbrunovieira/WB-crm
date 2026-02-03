-- Add hosting fields to Organization table
ALTER TABLE "Organization" ADD COLUMN "hasHosting" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN "hostingRenewalDate" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN "hostingPlan" TEXT;
ALTER TABLE "Organization" ADD COLUMN "hostingValue" DOUBLE PRECISION;
ALTER TABLE "Organization" ADD COLUMN "hostingReminderDays" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "Organization" ADD COLUMN "hostingNotes" TEXT;

-- Create indexes for hosting queries
CREATE INDEX "Organization_hasHosting_idx" ON "Organization"("hasHosting");
CREATE INDEX "Organization_hostingRenewalDate_idx" ON "Organization"("hostingRenewalDate");
