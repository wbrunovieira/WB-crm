-- CreateTable: Cadence
CREATE TABLE "cadences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "objective" TEXT,
    "durationDays" INTEGER NOT NULL DEFAULT 14,
    "icpId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "cadences_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "cadences_icpId_fkey" FOREIGN KEY ("icpId") REFERENCES "icps" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable: CadenceStep
CREATE TABLE "cadence_steps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cadenceId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "cadence_steps_cadenceId_fkey" FOREIGN KEY ("cadenceId") REFERENCES "cadences" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: LeadCadence
CREATE TABLE "lead_cadences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "cadenceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pausedAt" DATETIME,
    "completedAt" DATETIME,
    "cancelledAt" DATETIME,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "lead_cadences_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lead_cadences_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lead_cadences_cadenceId_fkey" FOREIGN KEY ("cadenceId") REFERENCES "cadences" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: LeadCadenceActivity
CREATE TABLE "lead_cadence_activities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadCadenceId" TEXT NOT NULL,
    "cadenceStepId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "scheduledDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_cadence_activities_leadCadenceId_fkey" FOREIGN KEY ("leadCadenceId") REFERENCES "lead_cadences" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lead_cadence_activities_cadenceStepId_fkey" FOREIGN KEY ("cadenceStepId") REFERENCES "cadence_steps" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lead_cadence_activities_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "cadences_slug_key" ON "cadences"("slug");
CREATE INDEX "cadences_ownerId_idx" ON "cadences"("ownerId");
CREATE INDEX "cadences_icpId_idx" ON "cadences"("icpId");
CREATE INDEX "cadences_status_idx" ON "cadences"("status");

CREATE INDEX "cadence_steps_cadenceId_idx" ON "cadence_steps"("cadenceId");
CREATE INDEX "cadence_steps_dayNumber_idx" ON "cadence_steps"("dayNumber");

CREATE UNIQUE INDEX "lead_cadences_leadId_cadenceId_key" ON "lead_cadences"("leadId", "cadenceId");
CREATE INDEX "lead_cadences_leadId_idx" ON "lead_cadences"("leadId");
CREATE INDEX "lead_cadences_cadenceId_idx" ON "lead_cadences"("cadenceId");
CREATE INDEX "lead_cadences_ownerId_idx" ON "lead_cadences"("ownerId");
CREATE INDEX "lead_cadences_status_idx" ON "lead_cadences"("status");

CREATE UNIQUE INDEX "lead_cadence_activities_activityId_key" ON "lead_cadence_activities"("activityId");
CREATE INDEX "lead_cadence_activities_leadCadenceId_idx" ON "lead_cadence_activities"("leadCadenceId");
CREATE INDEX "lead_cadence_activities_cadenceStepId_idx" ON "lead_cadence_activities"("cadenceStepId");
CREATE INDEX "lead_cadence_activities_activityId_idx" ON "lead_cadence_activities"("activityId");
