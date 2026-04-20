export interface MeetingRecord {
  id: string;
  title: string;
  googleEventId: string | null;
  startAt: Date;
  endAt: Date | null;
  actualStartAt: Date | null;
  actualEndAt: Date | null;
  status: string;
  activityId: string | null;
  nativeTranscriptUrl: string | null;
  recordingDriveId: string | null;
}

export interface MeetingTranscriptionRecord {
  id: string;
  transcriptionJobId: string;
}

export interface EndMeetingData {
  actualStartAt?: Date;
  actualEndAt: Date;
  attendeeEmails?: string;
}

export interface SaveRecordingData {
  recordingDriveId?: string;
  recordingUrl?: string;
  recordingMovedAt?: Date;
  nativeTranscriptUrl?: string;
  meetingSummary?: string;
  transcriptText?: string;
  transcribedAt?: Date;
  transcriptionJobId?: string;
}

export abstract class MeetingsRepository {
  abstract findScheduled(): Promise<MeetingRecord[]>;
  abstract findEndedPendingRecording(since: Date): Promise<MeetingRecord[]>;
  abstract findPendingTranscriptions(): Promise<MeetingTranscriptionRecord[]>;
  abstract markAsEnded(id: string, data: EndMeetingData): Promise<void>;
  abstract saveRecordingData(id: string, data: SaveRecordingData): Promise<void>;
  abstract saveTranscription(id: string, text: string): Promise<void>;
  abstract clearTranscriptionJob(id: string): Promise<void>;
  abstract completeActivity(activityId: string, at: Date): Promise<void>;
}
