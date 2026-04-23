import {
  MeetingsRepository,
  MeetingRecord,
  MeetingTranscriptionRecord,
  EndMeetingData,
  SaveRecordingData,
  CreateMeetingData,
  UpdateMeetingData,
} from "@/domain/integrations/meet/application/repositories/meetings.repository";

export class FakeMeetingsRepository extends MeetingsRepository {
  public items: (MeetingRecord & {
    transcriptionJobId?: string;
    transcribedAt?: Date;
  })[] = [];

  public completedActivities: { activityId: string; at: Date }[] = [];

  async findScheduled(): Promise<MeetingRecord[]> {
    return this.items.filter((m) => m.status === "scheduled");
  }

  async findScheduledWithRsvpData(): Promise<Array<{ id: string; googleEventId: string; attendeeEmails: string }>> {
    return this.items
      .filter((m) => m.status === "scheduled" && m.googleEventId !== null)
      .map((m) => ({ id: m.id, googleEventId: m.googleEventId!, attendeeEmails: m.attendeeEmails ?? "[]" }));
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

  async skipActivity(_activityId: string, _reason: string): Promise<void> { /* no-op in fake */ }

  async updateActivitySchedule(_activityId: string, _data: { dueDate?: Date; subject?: string }): Promise<void> { /* no-op in fake */ }

  async titleExistsByOwner(_ownerId: string, _title: string, _excludeId?: string): Promise<boolean> {
    return false;
  }

  async updateSummary(id: string, summary: string | null): Promise<void> {
    const item = this.items.find(m => m.id === id);
    if (item) item.meetingSummary = summary;
  }

  async findById(id: string): Promise<MeetingRecord | null> {
    return this.items.find(m => m.id === id) as MeetingRecord ?? null;
  }

  async findByOwner(ownerId: string): Promise<MeetingRecord[]> {
    return this.items.filter(m => m.ownerId === ownerId) as MeetingRecord[];
  }

  async create(data: CreateMeetingData): Promise<MeetingRecord> {
    const record: MeetingRecord = {
      id: Math.random().toString(36).slice(2),
      title: data.title, googleEventId: data.googleEventId ?? null,
      meetLink: data.meetLink ?? null, startAt: data.startAt, endAt: data.endAt ?? null,
      actualStartAt: null, actualEndAt: null, attendeeEmails: JSON.stringify(data.attendeeEmails),
      organizerEmail: data.organizerEmail ?? null,
      status: "scheduled", activityId: null, nativeTranscriptUrl: null,
      recordingDriveId: null, recordingUrl: null, transcriptText: null, meetingSummary: null,
      leadId: data.leadId ?? null, contactId: data.contactId ?? null,
      organizationId: data.organizationId ?? null, dealId: data.dealId ?? null,
      ownerId: data.ownerId, createdAt: new Date(), updatedAt: new Date(),
    };
    this.items.push(record as any);
    return record;
  }

  async update(id: string, data: UpdateMeetingData): Promise<MeetingRecord> {
    const item = this.items.find(m => m.id === id)!;
    if (data.title !== undefined) item.title = data.title;
    if (data.startAt !== undefined) item.startAt = data.startAt;
    if (data.endAt !== undefined) item.endAt = data.endAt;
    if (data.status !== undefined) item.status = data.status;
    if (data.attendeeEmails !== undefined) item.attendeeEmails = JSON.stringify(data.attendeeEmails);
    return item as MeetingRecord;
  }

  async updateRsvp(id: string, attendees: Array<{ email: string; responseStatus: string }>): Promise<void> {
    const item = this.items.find(m => m.id === id);
    if (item) item.attendeeEmails = JSON.stringify(attendees);
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter(m => m.id !== id);
  }

  addMeeting(meeting: Partial<MeetingRecord> & { id: string; title: string; startAt: Date; status: string }): void {
    this.items.push({
      googleEventId: null, meetLink: null, endAt: null, actualStartAt: null,
      actualEndAt: null, attendeeEmails: "[]", organizerEmail: null, activityId: null,
      nativeTranscriptUrl: null, recordingDriveId: null, recordingUrl: null,
      transcriptText: null, meetingSummary: null,
      leadId: null, contactId: null, organizationId: null,
      dealId: null, ownerId: "system", createdAt: new Date(), updatedAt: new Date(),
      ...meeting,
    } as any);
  }
}
