-- Snapshot of the recipient's communication language at enrollment (picks the email version).
ALTER TABLE "email_campaign_recipients" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'pt';
