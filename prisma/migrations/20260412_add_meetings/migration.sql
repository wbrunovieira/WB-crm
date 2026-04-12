-- Migration: add Meeting model for Google Meet integration
-- Safe: uses IF NOT EXISTS on all DDL

CREATE TABLE IF NOT EXISTS "meetings" (
  "id"                TEXT NOT NULL,
  "title"             TEXT NOT NULL,
  "googleEventId"     TEXT,
  "meetLink"          TEXT,
  "startAt"           TIMESTAMP(3) NOT NULL,
  "endAt"             TIMESTAMP(3),
  "attendeeEmails"    TEXT NOT NULL,
  "status"            TEXT NOT NULL DEFAULT 'scheduled',
  "recordingDriveId"  TEXT,
  "recordingUrl"      TEXT,
  "recordingMovedAt"  TIMESTAMP(3),
  "transcriptText"    TEXT,
  "transcribedAt"     TIMESTAMP(3),
  "leadId"            TEXT,
  "contactId"         TEXT,
  "dealId"            TEXT,
  "activityId"        TEXT,
  "ownerId"           TEXT NOT NULL,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
DO $$ BEGIN
  ALTER TABLE "meetings" ADD CONSTRAINT "meetings_googleEventId_key" UNIQUE ("googleEventId");
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "meetings" ADD CONSTRAINT "meetings_activityId_key" UNIQUE ("activityId");
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "meetings_ownerId_idx" ON "meetings"("ownerId");
CREATE INDEX IF NOT EXISTS "meetings_leadId_idx" ON "meetings"("leadId");
CREATE INDEX IF NOT EXISTS "meetings_contactId_idx" ON "meetings"("contactId");
CREATE INDEX IF NOT EXISTS "meetings_dealId_idx" ON "meetings"("dealId");
CREATE INDEX IF NOT EXISTS "meetings_status_idx" ON "meetings"("status");
CREATE INDEX IF NOT EXISTS "meetings_startAt_idx" ON "meetings"("startAt");

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "meetings" ADD CONSTRAINT "meetings_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "meetings" ADD CONSTRAINT "meetings_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "meetings" ADD CONSTRAINT "meetings_contactId_fkey"
    FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "meetings" ADD CONSTRAINT "meetings_dealId_fkey"
    FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "meetings" ADD CONSTRAINT "meetings_activityId_fkey"
    FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Phase 6.3: add transcriptionJobId for async transcription tracking
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "transcriptionJobId" TEXT;
