-- Partner cadence instances (reuse shared Cadence/CadenceStep templates).
-- Mirrors LeadCadence / LeadCadenceActivity. Additive: two new tables.
CREATE TABLE "partner_cadences" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "cadenceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pausedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "disqualificationReason" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "partner_cadences_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "partner_cadences_partnerId_cadenceId_key" ON "partner_cadences"("partnerId", "cadenceId");
CREATE INDEX "partner_cadences_partnerId_idx" ON "partner_cadences"("partnerId");
CREATE INDEX "partner_cadences_cadenceId_idx" ON "partner_cadences"("cadenceId");
CREATE INDEX "partner_cadences_ownerId_idx" ON "partner_cadences"("ownerId");
CREATE INDEX "partner_cadences_status_idx" ON "partner_cadences"("status");
ALTER TABLE "partner_cadences" ADD CONSTRAINT "partner_cadences_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_cadences" ADD CONSTRAINT "partner_cadences_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_cadences" ADD CONSTRAINT "partner_cadences_cadenceId_fkey" FOREIGN KEY ("cadenceId") REFERENCES "cadences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "partner_cadence_activities" (
    "id" TEXT NOT NULL,
    "partnerCadenceId" TEXT NOT NULL,
    "cadenceStepId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "partner_cadence_activities_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "partner_cadence_activities_activityId_key" ON "partner_cadence_activities"("activityId");
CREATE INDEX "partner_cadence_activities_partnerCadenceId_idx" ON "partner_cadence_activities"("partnerCadenceId");
CREATE INDEX "partner_cadence_activities_cadenceStepId_idx" ON "partner_cadence_activities"("cadenceStepId");
CREATE INDEX "partner_cadence_activities_activityId_idx" ON "partner_cadence_activities"("activityId");
ALTER TABLE "partner_cadence_activities" ADD CONSTRAINT "partner_cadence_activities_partnerCadenceId_fkey" FOREIGN KEY ("partnerCadenceId") REFERENCES "partner_cadences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_cadence_activities" ADD CONSTRAINT "partner_cadence_activities_cadenceStepId_fkey" FOREIGN KEY ("cadenceStepId") REFERENCES "cadence_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_cadence_activities" ADD CONSTRAINT "partner_cadence_activities_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
