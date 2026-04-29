-- CreateTable
CREATE TABLE "call_analyses" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "leadId" TEXT,
    "ownerId" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "noShowRisk" TEXT,
    "noShowRiskText" TEXT,
    "summary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMsg" TEXT,
    "jobId" TEXT,
    "spicedSituation" TEXT,
    "spicedPain" TEXT,
    "spicedImpact" TEXT,
    "spicedCritical" TEXT,
    "spicedEvidence" TEXT,
    "microPactos" TEXT,
    "schedulingTechniques" TEXT,
    "microAnalysis" TEXT,
    "positivePoints" TEXT,
    "improvementPoints" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "call_analyses_activityId_key" ON "call_analyses"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "call_analyses_jobId_key" ON "call_analyses"("jobId");

-- CreateIndex
CREATE INDEX "call_analyses_ownerId_idx" ON "call_analyses"("ownerId");

-- CreateIndex
CREATE INDEX "call_analyses_leadId_idx" ON "call_analyses"("leadId");

-- AddForeignKey
ALTER TABLE "call_analyses" ADD CONSTRAINT "call_analyses_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
