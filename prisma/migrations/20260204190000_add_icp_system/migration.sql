-- CreateTable: ICP (Ideal Customer Profile)
CREATE TABLE "icps" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "icps_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ICPVersion (Version history)
CREATE TABLE "icp_versions" (
    "id" TEXT NOT NULL,
    "icpId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "icp_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LeadICP (Junction Lead <-> ICP)
CREATE TABLE "lead_icps" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "icpId" TEXT NOT NULL,
    "matchScore" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_icps_pkey" PRIMARY KEY ("id")
);

-- CreateTable: OrganizationICP (Junction Organization <-> ICP)
CREATE TABLE "organization_icps" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "icpId" TEXT NOT NULL,
    "matchScore" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_icps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "icps_slug_key" ON "icps"("slug");
CREATE INDEX "icps_ownerId_idx" ON "icps"("ownerId");
CREATE INDEX "icps_status_idx" ON "icps"("status");

-- CreateIndex ICPVersion
CREATE UNIQUE INDEX "icp_versions_icpId_versionNumber_key" ON "icp_versions"("icpId", "versionNumber");
CREATE INDEX "icp_versions_icpId_idx" ON "icp_versions"("icpId");
CREATE INDEX "icp_versions_changedBy_idx" ON "icp_versions"("changedBy");

-- CreateIndex LeadICP
CREATE UNIQUE INDEX "lead_icps_leadId_icpId_key" ON "lead_icps"("leadId", "icpId");
CREATE INDEX "lead_icps_leadId_idx" ON "lead_icps"("leadId");
CREATE INDEX "lead_icps_icpId_idx" ON "lead_icps"("icpId");

-- CreateIndex OrganizationICP
CREATE UNIQUE INDEX "organization_icps_organizationId_icpId_key" ON "organization_icps"("organizationId", "icpId");
CREATE INDEX "organization_icps_organizationId_idx" ON "organization_icps"("organizationId");
CREATE INDEX "organization_icps_icpId_idx" ON "organization_icps"("icpId");

-- AddForeignKey
ALTER TABLE "icps" ADD CONSTRAINT "icps_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey ICPVersion
ALTER TABLE "icp_versions" ADD CONSTRAINT "icp_versions_icpId_fkey" FOREIGN KEY ("icpId") REFERENCES "icps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "icp_versions" ADD CONSTRAINT "icp_versions_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey LeadICP
ALTER TABLE "lead_icps" ADD CONSTRAINT "lead_icps_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_icps" ADD CONSTRAINT "lead_icps_icpId_fkey" FOREIGN KEY ("icpId") REFERENCES "icps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey OrganizationICP
ALTER TABLE "organization_icps" ADD CONSTRAINT "organization_icps_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_icps" ADD CONSTRAINT "organization_icps_icpId_fkey" FOREIGN KEY ("icpId") REFERENCES "icps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
