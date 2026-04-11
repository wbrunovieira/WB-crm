-- AlterTable
ALTER TABLE "activities" ADD COLUMN "emailMessageId" TEXT;
ALTER TABLE "activities" ADD COLUMN "emailSubject" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "activities_emailMessageId_key" ON "activities"("emailMessageId");
