-- CreateTable: Tech Profile Options (what technologies are available to track)
CREATE TABLE "tech_profile_languages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "tech_profile_frameworks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "tech_profile_hosting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "tech_profile_databases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "tech_profile_erps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "tech_profile_crms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "tech_profile_ecommerce" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable: Lead Tech Profile Junction Tables
CREATE TABLE "lead_languages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "lead_languages_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lead_languages_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "tech_profile_languages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "lead_frameworks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "lead_frameworks_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lead_frameworks_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "tech_profile_frameworks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "lead_hosting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "hostingId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "lead_hosting_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lead_hosting_hostingId_fkey" FOREIGN KEY ("hostingId") REFERENCES "tech_profile_hosting" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "lead_databases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "lead_databases_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lead_databases_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "tech_profile_databases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "lead_erps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "erpId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "lead_erps_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lead_erps_erpId_fkey" FOREIGN KEY ("erpId") REFERENCES "tech_profile_erps" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "lead_crms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "crmId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "lead_crms_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lead_crms_crmId_fkey" FOREIGN KEY ("crmId") REFERENCES "tech_profile_crms" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "lead_ecommerce" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "ecommerceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "lead_ecommerce_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lead_ecommerce_ecommerceId_fkey" FOREIGN KEY ("ecommerceId") REFERENCES "tech_profile_ecommerce" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: Organization Tech Profile Junction Tables
CREATE TABLE "organization_languages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "organization_languages_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "organization_languages_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "tech_profile_languages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "organization_frameworks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "organization_frameworks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "organization_frameworks_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "tech_profile_frameworks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "organization_hosting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "hostingId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "organization_hosting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "organization_hosting_hostingId_fkey" FOREIGN KEY ("hostingId") REFERENCES "tech_profile_hosting" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "organization_databases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "databaseId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "organization_databases_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "organization_databases_databaseId_fkey" FOREIGN KEY ("databaseId") REFERENCES "tech_profile_databases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "organization_erps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "erpId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "organization_erps_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "organization_erps_erpId_fkey" FOREIGN KEY ("erpId") REFERENCES "tech_profile_erps" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "organization_crms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "crmId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "organization_crms_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "organization_crms_crmId_fkey" FOREIGN KEY ("crmId") REFERENCES "tech_profile_crms" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "organization_ecommerce" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "ecommerceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "organization_ecommerce_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "organization_ecommerce_ecommerceId_fkey" FOREIGN KEY ("ecommerceId") REFERENCES "tech_profile_ecommerce" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "tech_profile_languages_slug_key" ON "tech_profile_languages"("slug");
CREATE INDEX "tech_profile_languages_isActive_idx" ON "tech_profile_languages"("isActive");

CREATE UNIQUE INDEX "tech_profile_frameworks_slug_key" ON "tech_profile_frameworks"("slug");
CREATE INDEX "tech_profile_frameworks_isActive_idx" ON "tech_profile_frameworks"("isActive");

CREATE UNIQUE INDEX "tech_profile_hosting_slug_key" ON "tech_profile_hosting"("slug");
CREATE INDEX "tech_profile_hosting_isActive_idx" ON "tech_profile_hosting"("isActive");
CREATE INDEX "tech_profile_hosting_type_idx" ON "tech_profile_hosting"("type");

CREATE UNIQUE INDEX "tech_profile_databases_slug_key" ON "tech_profile_databases"("slug");
CREATE INDEX "tech_profile_databases_isActive_idx" ON "tech_profile_databases"("isActive");
CREATE INDEX "tech_profile_databases_type_idx" ON "tech_profile_databases"("type");

CREATE UNIQUE INDEX "tech_profile_erps_slug_key" ON "tech_profile_erps"("slug");
CREATE INDEX "tech_profile_erps_isActive_idx" ON "tech_profile_erps"("isActive");

CREATE UNIQUE INDEX "tech_profile_crms_slug_key" ON "tech_profile_crms"("slug");
CREATE INDEX "tech_profile_crms_isActive_idx" ON "tech_profile_crms"("isActive");

CREATE UNIQUE INDEX "tech_profile_ecommerce_slug_key" ON "tech_profile_ecommerce"("slug");
CREATE INDEX "tech_profile_ecommerce_isActive_idx" ON "tech_profile_ecommerce"("isActive");

-- Lead junction unique indexes
CREATE UNIQUE INDEX "lead_languages_leadId_languageId_key" ON "lead_languages"("leadId", "languageId");
CREATE INDEX "lead_languages_leadId_idx" ON "lead_languages"("leadId");
CREATE INDEX "lead_languages_languageId_idx" ON "lead_languages"("languageId");

CREATE UNIQUE INDEX "lead_frameworks_leadId_frameworkId_key" ON "lead_frameworks"("leadId", "frameworkId");
CREATE INDEX "lead_frameworks_leadId_idx" ON "lead_frameworks"("leadId");
CREATE INDEX "lead_frameworks_frameworkId_idx" ON "lead_frameworks"("frameworkId");

CREATE UNIQUE INDEX "lead_hosting_leadId_hostingId_key" ON "lead_hosting"("leadId", "hostingId");
CREATE INDEX "lead_hosting_leadId_idx" ON "lead_hosting"("leadId");
CREATE INDEX "lead_hosting_hostingId_idx" ON "lead_hosting"("hostingId");

CREATE UNIQUE INDEX "lead_databases_leadId_databaseId_key" ON "lead_databases"("leadId", "databaseId");
CREATE INDEX "lead_databases_leadId_idx" ON "lead_databases"("leadId");
CREATE INDEX "lead_databases_databaseId_idx" ON "lead_databases"("databaseId");

CREATE UNIQUE INDEX "lead_erps_leadId_erpId_key" ON "lead_erps"("leadId", "erpId");
CREATE INDEX "lead_erps_leadId_idx" ON "lead_erps"("leadId");
CREATE INDEX "lead_erps_erpId_idx" ON "lead_erps"("erpId");

CREATE UNIQUE INDEX "lead_crms_leadId_crmId_key" ON "lead_crms"("leadId", "crmId");
CREATE INDEX "lead_crms_leadId_idx" ON "lead_crms"("leadId");
CREATE INDEX "lead_crms_crmId_idx" ON "lead_crms"("crmId");

CREATE UNIQUE INDEX "lead_ecommerce_leadId_ecommerceId_key" ON "lead_ecommerce"("leadId", "ecommerceId");
CREATE INDEX "lead_ecommerce_leadId_idx" ON "lead_ecommerce"("leadId");
CREATE INDEX "lead_ecommerce_ecommerceId_idx" ON "lead_ecommerce"("ecommerceId");

-- Organization junction unique indexes
CREATE UNIQUE INDEX "organization_languages_organizationId_languageId_key" ON "organization_languages"("organizationId", "languageId");
CREATE INDEX "organization_languages_organizationId_idx" ON "organization_languages"("organizationId");
CREATE INDEX "organization_languages_languageId_idx" ON "organization_languages"("languageId");

CREATE UNIQUE INDEX "organization_frameworks_organizationId_frameworkId_key" ON "organization_frameworks"("organizationId", "frameworkId");
CREATE INDEX "organization_frameworks_organizationId_idx" ON "organization_frameworks"("organizationId");
CREATE INDEX "organization_frameworks_frameworkId_idx" ON "organization_frameworks"("frameworkId");

CREATE UNIQUE INDEX "organization_hosting_organizationId_hostingId_key" ON "organization_hosting"("organizationId", "hostingId");
CREATE INDEX "organization_hosting_organizationId_idx" ON "organization_hosting"("organizationId");
CREATE INDEX "organization_hosting_hostingId_idx" ON "organization_hosting"("hostingId");

CREATE UNIQUE INDEX "organization_databases_organizationId_databaseId_key" ON "organization_databases"("organizationId", "databaseId");
CREATE INDEX "organization_databases_organizationId_idx" ON "organization_databases"("organizationId");
CREATE INDEX "organization_databases_databaseId_idx" ON "organization_databases"("databaseId");

CREATE UNIQUE INDEX "organization_erps_organizationId_erpId_key" ON "organization_erps"("organizationId", "erpId");
CREATE INDEX "organization_erps_organizationId_idx" ON "organization_erps"("organizationId");
CREATE INDEX "organization_erps_erpId_idx" ON "organization_erps"("erpId");

CREATE UNIQUE INDEX "organization_crms_organizationId_crmId_key" ON "organization_crms"("organizationId", "crmId");
CREATE INDEX "organization_crms_organizationId_idx" ON "organization_crms"("organizationId");
CREATE INDEX "organization_crms_crmId_idx" ON "organization_crms"("crmId");

CREATE UNIQUE INDEX "organization_ecommerce_organizationId_ecommerceId_key" ON "organization_ecommerce"("organizationId", "ecommerceId");
CREATE INDEX "organization_ecommerce_organizationId_idx" ON "organization_ecommerce"("organizationId");
CREATE INDEX "organization_ecommerce_ecommerceId_idx" ON "organization_ecommerce"("ecommerceId");
