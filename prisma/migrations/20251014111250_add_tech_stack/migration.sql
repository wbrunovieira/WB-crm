-- CreateTable
CREATE TABLE "tech_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "tech_languages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "tech_frameworks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "languageSlug" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "deal_tech_stacks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealId" TEXT NOT NULL,
    "techCategoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "deal_tech_stacks_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "deal_tech_stacks_techCategoryId_fkey" FOREIGN KEY ("techCategoryId") REFERENCES "tech_categories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "deal_languages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "deal_languages_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "deal_languages_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "tech_languages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "deal_frameworks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealId" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "deal_frameworks_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "deal_frameworks_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "tech_frameworks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "tech_categories_slug_key" ON "tech_categories"("slug");

-- CreateIndex
CREATE INDEX "tech_categories_isActive_idx" ON "tech_categories"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "tech_languages_slug_key" ON "tech_languages"("slug");

-- CreateIndex
CREATE INDEX "tech_languages_isActive_idx" ON "tech_languages"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "tech_frameworks_slug_key" ON "tech_frameworks"("slug");

-- CreateIndex
CREATE INDEX "tech_frameworks_isActive_idx" ON "tech_frameworks"("isActive");

-- CreateIndex
CREATE INDEX "tech_frameworks_languageSlug_idx" ON "tech_frameworks"("languageSlug");

-- CreateIndex
CREATE UNIQUE INDEX "deal_tech_stacks_dealId_techCategoryId_key" ON "deal_tech_stacks"("dealId", "techCategoryId");

-- CreateIndex
CREATE INDEX "deal_tech_stacks_dealId_idx" ON "deal_tech_stacks"("dealId");

-- CreateIndex
CREATE INDEX "deal_tech_stacks_techCategoryId_idx" ON "deal_tech_stacks"("techCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "deal_languages_dealId_languageId_key" ON "deal_languages"("dealId", "languageId");

-- CreateIndex
CREATE INDEX "deal_languages_dealId_idx" ON "deal_languages"("dealId");

-- CreateIndex
CREATE INDEX "deal_languages_languageId_idx" ON "deal_languages"("languageId");

-- CreateIndex
CREATE INDEX "deal_languages_isPrimary_idx" ON "deal_languages"("isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "deal_frameworks_dealId_frameworkId_key" ON "deal_frameworks"("dealId", "frameworkId");

-- CreateIndex
CREATE INDEX "deal_frameworks_dealId_idx" ON "deal_frameworks"("dealId");

-- CreateIndex
CREATE INDEX "deal_frameworks_frameworkId_idx" ON "deal_frameworks"("frameworkId");
