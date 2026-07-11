-- Partner lifecycle stage (orthogonal to partnerType):
-- prospect = "partner lead" (registered, not yet officialized)
-- active   = partnership officialized
-- inactive = ended / paused
ALTER TABLE "partners" ADD COLUMN "partnerStatus" TEXT NOT NULL DEFAULT 'prospect';

-- When the partnership was officialized (set when status becomes active).
ALTER TABLE "partners" ADD COLUMN "partnershipStartedAt" TIMESTAMP(3);

CREATE INDEX "partners_partnerStatus_idx" ON "partners"("partnerStatus");
