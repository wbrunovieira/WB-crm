export interface MeetingRecord {
  id: string;
  title: string;
  googleEventId: string | null;
  meetLink: string | null;
  startAt: Date;
  endAt: Date | null;
  actualStartAt: Date | null;
  actualEndAt: Date | null;
  attendeeEmails: string;
  status: string;
  activityId: string | null;
  nativeTranscriptUrl: string | null;
  recordingDriveId: string | null;
  recordingUrl: string | null;
  transcriptText: string | null;
  meetingSummary: string | null;
  leadId: string | null;
  contactId: string | null;
  organizationId: string | null;
  dealId: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  activity?: { id: string; completed: boolean; completedAt: Date | null } | null;
}

export interface MeetingFilters {
  leadId?: string;
  dealId?: string;
  organizationId?: string;
  contactId?: string;
}

export interface CreateMeetingData {
  title: string;
  startAt: Date;
  endAt?: Date;
  attendeeEmails: string[];
  googleEventId?: string;
  meetLink?: string;
  leadId?: string;
  contactId?: string;
  organizationId?: string;
  dealId?: string;
  ownerId: string;
  description?: string;
  createActivity?: boolean;
}

export interface UpdateMeetingData {
  title?: string;
  startAt?: Date;
  endAt?: Date;
  status?: string;
  attendeeEmails?: string[];
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
  abstract skipActivity(activityId: string, reason: string): Promise<void>;
  abstract updateActivitySchedule(activityId: string, data: { dueDate?: Date; subject?: string }): Promise<void>;
  // CRUD methods
  abstract findById(id: string): Promise<MeetingRecord | null>;
  abstract findByOwner(ownerId: string, filters?: MeetingFilters): Promise<MeetingRecord[]>;
  abstract titleExistsByOwner(ownerId: string, title: string, excludeId?: string): Promise<boolean>;
  abstract updateSummary(id: string, summary: string | null): Promise<void>;
  abstract create(data: CreateMeetingData): Promise<MeetingRecord>;
  abstract update(id: string, data: UpdateMeetingData): Promise<MeetingRecord>;
  abstract delete(id: string): Promise<void>;
}
