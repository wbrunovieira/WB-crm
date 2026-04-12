-- Add GoTo recording and transcription fields to activities table
-- Phase 6: call recording → Google Drive + audio player + transcription

ALTER TABLE "activities"
  ADD COLUMN IF NOT EXISTS "gotoRecordingId"        TEXT,
  ADD COLUMN IF NOT EXISTS "gotoRecordingDriveId"   TEXT,
  ADD COLUMN IF NOT EXISTS "gotoRecordingUrl"        TEXT,
  ADD COLUMN IF NOT EXISTS "gotoTranscriptionJobId" TEXT,
  ADD COLUMN IF NOT EXISTS "gotoTranscriptText"     TEXT;
