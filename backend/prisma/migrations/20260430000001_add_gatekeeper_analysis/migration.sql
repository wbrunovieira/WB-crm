-- CreateTable: gatekeeper_analyses
CREATE TABLE "gatekeeper_analyses" (
    "id"         TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "ownerId"    TEXT NOT NULL,

    "score"      DOUBLE PRECISION,
    "summary"    TEXT,
    "status"     TEXT NOT NULL DEFAULT 'pending',
    "errorMsg"   TEXT,
    "jobId"      TEXT,

    "raportRecepcao"  TEXT,
    "raportAlianca"   TEXT,
    "raportPerguntas" TEXT,
    "raportObjecoes"  TEXT,
    "raportResultado" TEXT,
    "raportTecnicas"  TEXT,

    "positivePoints"    TEXT,
    "improvementPoints" TEXT,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gatekeeper_analyses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gatekeeper_analyses_activityId_key" ON "gatekeeper_analyses"("activityId");
CREATE UNIQUE INDEX "gatekeeper_analyses_jobId_key"      ON "gatekeeper_analyses"("jobId");
CREATE INDEX        "gatekeeper_analyses_ownerId_idx"    ON "gatekeeper_analyses"("ownerId");

ALTER TABLE "gatekeeper_analyses"
  ADD CONSTRAINT "gatekeeper_analyses_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: gatekeeper_batches
CREATE TABLE "gatekeeper_batches" (
    "id"      TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,

    "status"  TEXT NOT NULL DEFAULT 'pending',
    "jobId"   TEXT,
    "errorMsg" TEXT,

    "analysisIds"           TEXT,
    "overallScore"          DOUBLE PRECISION,
    "dimensionAverages"     TEXT,
    "patterns"              TEXT,
    "comparisonWithHistory" TEXT,
    "individualHighlights"  TEXT,
    "recommendations"       TEXT,
    "newSummary"            TEXT,
    "positivePoints"        TEXT,
    "improvementPoints"     TEXT,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gatekeeper_batches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gatekeeper_batches_jobId_key"   ON "gatekeeper_batches"("jobId");
CREATE INDEX        "gatekeeper_batches_ownerId_idx" ON "gatekeeper_batches"("ownerId");
