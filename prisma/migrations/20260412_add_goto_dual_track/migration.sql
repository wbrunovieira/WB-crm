-- Add dual-track recording fields for GoTo Connect calls
-- Agent track: gotoRecordingUrl (existing), gotoTranscriptionJobId (existing)
-- Client track: gotoRecordingUrl2 (new), gotoTranscriptionJobId2 (new)
-- gotoTranscriptText now stores JSON: TranscriptSegment[] with speaker attribution

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS "gotoRecordingUrl2"       TEXT,
  ADD COLUMN IF NOT EXISTS "gotoTranscriptionJobId2" TEXT;
