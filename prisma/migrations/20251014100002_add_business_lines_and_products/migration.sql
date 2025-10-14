-- CreateTable
CREATE TABLE "business_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "businessLineId" TEXT NOT NULL,
    "basePrice" REAL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "pricingType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "products_businessLineId_fkey" FOREIGN KEY ("businessLineId") REFERENCES "business_lines" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lead_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "interestLevel" TEXT,
    "estimatedValue" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "lead_products_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lead_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "organization_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'interested',
    "firstPurchaseAt" DATETIME,
    "lastPurchaseAt" DATETIME,
    "totalPurchases" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "organization_products_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "organization_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "deal_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dealId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "totalValue" REAL NOT NULL,
    "description" TEXT,
    "deliveryTime" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "deal_products_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "deal_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "partner_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "expertiseLevel" TEXT,
    "canRefer" BOOLEAN NOT NULL DEFAULT true,
    "canDeliver" BOOLEAN NOT NULL DEFAULT false,
    "commissionType" TEXT,
    "commissionValue" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "partner_products_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "partner_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "business_lines_slug_key" ON "business_lines"("slug");

-- CreateIndex
CREATE INDEX "business_lines_isActive_idx" ON "business_lines"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_businessLineId_idx" ON "products"("businessLineId");

-- CreateIndex
CREATE INDEX "products_isActive_idx" ON "products"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "lead_products_leadId_productId_key" ON "lead_products"("leadId", "productId");

-- CreateIndex
CREATE INDEX "lead_products_leadId_idx" ON "lead_products"("leadId");

-- CreateIndex
CREATE INDEX "lead_products_productId_idx" ON "lead_products"("productId");

-- CreateIndex
CREATE INDEX "lead_products_interestLevel_idx" ON "lead_products"("interestLevel");

-- CreateIndex
CREATE UNIQUE INDEX "organization_products_organizationId_productId_key" ON "organization_products"("organizationId", "productId");

-- CreateIndex
CREATE INDEX "organization_products_organizationId_idx" ON "organization_products"("organizationId");

-- CreateIndex
CREATE INDEX "organization_products_productId_idx" ON "organization_products"("productId");

-- CreateIndex
CREATE INDEX "organization_products_status_idx" ON "organization_products"("status");

-- CreateIndex
CREATE UNIQUE INDEX "deal_products_dealId_productId_key" ON "deal_products"("dealId", "productId");

-- CreateIndex
CREATE INDEX "deal_products_dealId_idx" ON "deal_products"("dealId");

-- CreateIndex
CREATE INDEX "deal_products_productId_idx" ON "deal_products"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "partner_products_partnerId_productId_key" ON "partner_products"("partnerId", "productId");

-- CreateIndex
CREATE INDEX "partner_products_partnerId_idx" ON "partner_products"("partnerId");

-- CreateIndex
CREATE INDEX "partner_products_productId_idx" ON "partner_products"("productId");

-- CreateIndex
CREATE INDEX "partner_products_canRefer_idx" ON "partner_products"("canRefer");
