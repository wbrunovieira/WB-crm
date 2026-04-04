-- Add closedAt field to track when a deal was won/lost
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);

-- Backfill: for existing won/lost deals, set closedAt from the most recent stage history entry
UPDATE "deals" d
SET "closedAt" = (
  SELECT dsh."changedAt"
  FROM "deal_stage_history" dsh
  WHERE dsh."dealId" = d.id
  ORDER BY dsh."changedAt" DESC
  LIMIT 1
)
WHERE d.status IN ('won', 'lost') AND d."closedAt" IS NULL;

-- If no stage history exists, fallback to updatedAt
UPDATE "deals"
SET "closedAt" = "updatedAt"
WHERE status IN ('won', 'lost') AND "closedAt" IS NULL;
