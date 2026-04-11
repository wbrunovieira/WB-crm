-- CreateTable
CREATE TABLE "gmail_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gmail_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gmail_templates_active_idx" ON "gmail_templates"("active");
