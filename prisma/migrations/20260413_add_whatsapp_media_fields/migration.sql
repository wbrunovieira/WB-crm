-- Add media Drive and transcription fields to whatsapp_messages table
ALTER TABLE "whatsapp_messages"
  ADD COLUMN IF NOT EXISTS "mediaDriveId"            TEXT,
  ADD COLUMN IF NOT EXISTS "mediaTranscriptionJobId" TEXT,
  ADD COLUMN IF NOT EXISTS "mediaTranscriptText"     TEXT;
