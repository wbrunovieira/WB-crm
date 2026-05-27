-- Add campaign email tracking fields to activities table
ALTER TABLE "activities" ADD COLUMN "emailCampaignSendId" TEXT;
ALTER TABLE "activities" ADD COLUMN "emailCampaignId" TEXT;

CREATE UNIQUE INDEX "activities_emailCampaignSendId_key" ON "activities"("emailCampaignSendId");
