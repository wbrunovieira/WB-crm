-- CreateTable
CREATE TABLE "meet_analyses" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "leadId" TEXT,
    "ownerId" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "summary" TEXT,
    "nextStep" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMsg" TEXT,
    "jobId" TEXT,
    "diagBusiness" TEXT,
    "diagGaps" TEXT,
    "diagUrgency" TEXT,
    "diagDecisionPower" TEXT,
    "diagEngagement" TEXT,
    "diagClosing" TEXT,
    "positivePoints" TEXT,
    "improvementPoints" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meet_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meet_analyses_activityId_key" ON "meet_analyses"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "meet_analyses_jobId_key" ON "meet_analyses"("jobId");

-- CreateIndex
CREATE INDEX "meet_analyses_ownerId_idx" ON "meet_analyses"("ownerId");

-- CreateIndex
CREATE INDEX "meet_analyses_leadId_idx" ON "meet_analyses"("leadId");

-- AddForeignKey
ALTER TABLE "meet_analyses" ADD CONSTRAINT "meet_analyses_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
