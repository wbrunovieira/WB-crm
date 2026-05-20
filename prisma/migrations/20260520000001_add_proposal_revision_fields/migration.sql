ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "revisionNumber" INTEGER;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "originalProposalId" TEXT;
