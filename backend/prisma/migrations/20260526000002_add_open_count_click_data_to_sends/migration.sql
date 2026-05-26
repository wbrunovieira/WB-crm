ALTER TABLE "email_campaign_sends" ADD COLUMN IF NOT EXISTS "openCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "email_campaign_sends" ADD COLUMN IF NOT EXISTS "clickData" TEXT;
