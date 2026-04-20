import {
  MeetingsRepository,
  MeetingRecord,
  MeetingTranscriptionRecord,
  EndMeetingData,
  SaveRecordingData,
} from "@/domain/integrations/meet/application/repositories/meetings.repository";

export class FakeMeetingsRepository extends MeetingsRepository {
  public items: (MeetingRecord & {
    transcriptionJobId?: string;
    transcriptText?: string;
    transcribedAt?: Date;
    attendeeEmails?: string;
    meetingSummary?: string;
    recordingUrl?: string;
  })[] = [];

  public completedActivities: { activityId: string; at: Date }[] = [];

  async findScheduled(): Promise<MeetingRecord[]> {
    return this.items.filter((m) => m.status === "scheduled");
  }

  async findEndedPendingRecording(since: Date): Promise<MeetingRecord[]> {
    return this.items.filter(
      (m) =>
        m.status === "ended" &&
        !m.recordingDriveId &&
        m.googleEventId !== null &&
        m.actualEndAt !== null &&
        m.actualEndAt! > since,
    );
  }

  async findPendingTranscriptions(): Promise<MeetingTranscriptionRecord[]> {
    return this.items
      .filter((m) => m.transcriptionJobId && !m.transcriptText)
      .map((m) => ({ id: m.id, transcriptionJobId: m.transcriptionJobId! }));
  }

  async markAsEnded(id: string, data: EndMeetingData): Promise<void> {
    const item = this.items.find((m) => m.id === id);
    if (!item) return;
    item.status = "ended";
    item.actualEndAt = data.actualEndAt;
    if (data.actualStartAt) item.actualStartAt = data.actualStartAt;
    if (data.attendeeEmails) item.attendeeEmails = data.attendeeEmails;
  }

  async saveRecordingData(id: string, data: SaveRecordingData): Promise<void> {
    const item = this.items.find((m) => m.id === id);
    if (!item) return;
    if (data.recordingDriveId !== undefined) item.recordingDriveId = data.recordingDriveId ?? null;
    if (data.recordingUrl !== undefined) item.recordingUrl = data.recordingUrl;
    if (data.nativeTranscriptUrl !== undefined) item.nativeTranscriptUrl = data.nativeTranscriptUrl ?? null;
    if (data.meetingSummary !== undefined) item.meetingSummary = data.meetingSummary;
    if (data.transcriptionJobId !== undefined) item.transcriptionJobId = data.transcriptionJobId;
    if (data.transcriptText !== undefined) item.transcriptText = data.transcriptText;
    if (data.transcribedAt !== undefined) item.transcribedAt = data.transcribedAt;
  }

  async saveTranscription(id: string, text: string): Promise<void> {
    const item = this.items.find((m) => m.id === id);
    if (!item) return;
    item.transcriptText = text;
    item.transcribedAt = new Date();
    item.transcriptionJobId = undefined;
  }

  async clearTranscriptionJob(id: string): Promise<void> {
    const item = this.items.find((m) => m.id === id);
    if (!item) return;
    item.transcriptionJobId = undefined;
  }

  async completeActivity(activityId: string, at: Date): Promise<void> {
    this.completedActivities.push({ activityId, at });
  }

  addMeeting(meeting: Partial<MeetingRecord> & { id: string; title: string; startAt: Date; status: string }): void {
    this.items.push({
      googleEventId: null,
      endAt: null,
      actualStartAt: null,
      actualEndAt: null,
      activityId: null,
      nativeTranscriptUrl: null,
      recordingDriveId: null,
      ...meeting,
    });
  }
}
