ALTER TABLE "scheduled_emails" ADD COLUMN IF NOT EXISTS "channel" TEXT NOT NULL DEFAULT 'email';
ALTER TABLE "scheduled_emails" ADD COLUMN IF NOT EXISTS "recipientPhone" TEXT;
