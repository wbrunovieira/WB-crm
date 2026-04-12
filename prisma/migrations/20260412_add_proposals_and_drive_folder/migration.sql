-- AddColumn driveFolderId to leads
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "driveFolderId" TEXT;

-- AddColumn driveFolderId to organizations
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "driveFolderId" TEXT;

-- CreateTable proposals
CREATE TABLE IF NOT EXISTS "proposals" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "driveFileId" TEXT,
    "driveUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "sentAt" TIMESTAMP(3),
    "leadId" TEXT,
    "dealId" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "proposals_leadId_idx" ON "proposals"("leadId");
CREATE INDEX IF NOT EXISTS "proposals_dealId_idx" ON "proposals"("dealId");
CREATE INDEX IF NOT EXISTS "proposals_ownerId_idx" ON "proposals"("ownerId");

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "proposals" ADD CONSTRAINT "proposals_dealId_fkey"
    FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "proposals" ADD CONSTRAINT "proposals_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
