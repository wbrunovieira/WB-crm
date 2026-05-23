-- AlterTable: add unsubscribedAt to email_campaign_recipients
ALTER TABLE "email_campaign_recipients" ADD COLUMN "unsubscribedAt" TIMESTAMP(3);

-- CreateTable: email suppression list
CREATE TABLE "email_suppressions" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_suppressions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_suppressions_email_ownerId_key" ON "email_suppressions"("email", "ownerId");

-- CreateIndex
CREATE INDEX "email_suppressions_ownerId_idx" ON "email_suppressions"("ownerId");

-- AddForeignKey
ALTER TABLE "email_suppressions" ADD CONSTRAINT "email_suppressions_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
