-- Partner tech profile: 7 junction tables mirroring the Organization* ones.
-- Additive (new tables + indexes + FKs). No data change.

CREATE TABLE "partner_languages" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "partner_languages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "partner_languages_partnerId_languageId_key" ON "partner_languages"("partnerId", "languageId");
CREATE INDEX "partner_languages_partnerId_idx" ON "partner_languages"("partnerId");
CREATE INDEX "partner_languages_languageId_idx" ON "partner_languages"("languageId");
ALTER TABLE "partner_languages" ADD CONSTRAINT "partner_languages_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_languages" ADD CONSTRAINT "partner_languages_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "tech_profile_languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "partner_frameworks" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "partner_frameworks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "partner_frameworks_partnerId_frameworkId_key" ON "partner_frameworks"("partnerId", "frameworkId");
CREATE INDEX "partner_frameworks_partnerId_idx" ON "partner_frameworks"("partnerId");
CREATE INDEX "partner_frameworks_frameworkId_idx" ON "partner_frameworks"("frameworkId");
ALTER TABLE "partner_frameworks" ADD CONSTRAINT "partner_frameworks_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_frameworks" ADD CONSTRAINT "partner_frameworks_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "tech_profile_frameworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "partner_hosting" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "hostingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "partner_hosting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "partner_hosting_partnerId_hostingId_key" ON "partner_hosting"("partnerId", "hostingId");
CREATE INDEX "partner_hosting_partnerId_idx" ON "partner_hosting"("partnerId");
CREATE INDEX "partner_hosting_hostingId_idx" ON "partner_hosting"("hostingId");
ALTER TABLE "partner_hosting" ADD CONSTRAINT "partner_hosting_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_hosting" ADD CONSTRAINT "partner_hosting_hostingId_fkey" FOREIGN KEY ("hostingId") REFERENCES "tech_profile_hosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "partner_databases" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "partner_databases_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "partner_databases_partnerId_databaseId_key" ON "partner_databases"("partnerId", "databaseId");
CREATE INDEX "partner_databases_partnerId_idx" ON "partner_databases"("partnerId");
CREATE INDEX "partner_databases_databaseId_idx" ON "partner_databases"("databaseId");
ALTER TABLE "partner_databases" ADD CONSTRAINT "partner_databases_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_databases" ADD CONSTRAINT "partner_databases_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "tech_profile_databases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "partner_erps" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "erpId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "partner_erps_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "partner_erps_partnerId_erpId_key" ON "partner_erps"("partnerId", "erpId");
CREATE INDEX "partner_erps_partnerId_idx" ON "partner_erps"("partnerId");
CREATE INDEX "partner_erps_erpId_idx" ON "partner_erps"("erpId");
ALTER TABLE "partner_erps" ADD CONSTRAINT "partner_erps_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_erps" ADD CONSTRAINT "partner_erps_erpId_fkey" FOREIGN KEY ("erpId") REFERENCES "tech_profile_erps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "partner_crms" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "crmId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "partner_crms_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "partner_crms_partnerId_crmId_key" ON "partner_crms"("partnerId", "crmId");
CREATE INDEX "partner_crms_partnerId_idx" ON "partner_crms"("partnerId");
CREATE INDEX "partner_crms_crmId_idx" ON "partner_crms"("crmId");
ALTER TABLE "partner_crms" ADD CONSTRAINT "partner_crms_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_crms" ADD CONSTRAINT "partner_crms_crmId_fkey" FOREIGN KEY ("crmId") REFERENCES "tech_profile_crms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "partner_ecommerce" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "ecommerceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "partner_ecommerce_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "partner_ecommerce_partnerId_ecommerceId_key" ON "partner_ecommerce"("partnerId", "ecommerceId");
CREATE INDEX "partner_ecommerce_partnerId_idx" ON "partner_ecommerce"("partnerId");
CREATE INDEX "partner_ecommerce_ecommerceId_idx" ON "partner_ecommerce"("ecommerceId");
ALTER TABLE "partner_ecommerce" ADD CONSTRAINT "partner_ecommerce_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_ecommerce" ADD CONSTRAINT "partner_ecommerce_ecommerceId_fkey" FOREIGN KEY ("ecommerceId") REFERENCES "tech_profile_ecommerce"("id") ON DELETE CASCADE ON UPDATE CASCADE;
