import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import {
  MeetingsRepository,
  MeetingRecord,
  MeetingTranscriptionRecord,
  EndMeetingData,
  SaveRecordingData,
} from "../application/repositories/meetings.repository";

@Injectable()
export class PrismaMeetingsRepository extends MeetingsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findScheduled(): Promise<MeetingRecord[]> {
    const rows = await this.prisma.meeting.findMany({
      where: { status: "scheduled" },
      select: {
        id: true, title: true, googleEventId: true, startAt: true, endAt: true,
        actualStartAt: true, actualEndAt: true, status: true, activityId: true,
        nativeTranscriptUrl: true, recordingDriveId: true,
      },
    });
    return rows.map(this.toDomain);
  }

  async findEndedPendingRecording(since: Date): Promise<MeetingRecord[]> {
    const rows = await this.prisma.meeting.findMany({
      where: {
        status: "ended",
        recordingDriveId: null,
        googleEventId: { not: null },
        actualEndAt: { gt: since },
      },
      select: {
        id: true, title: true, googleEventId: true, startAt: true, endAt: true,
        actualStartAt: true, actualEndAt: true, status: true, activityId: true,
        nativeTranscriptUrl: true, recordingDriveId: true,
      },
    });
    return rows.map(this.toDomain);
  }

  async findPendingTranscriptions(): Promise<MeetingTranscriptionRecord[]> {
    const rows = await this.prisma.meeting.findMany({
      where: { transcriptionJobId: { not: null }, transcriptText: null },
      select: { id: true, transcriptionJobId: true },
    });
    return rows.map((r) => ({ id: r.id, transcriptionJobId: r.transcriptionJobId! }));
  }

  async markAsEnded(id: string, data: EndMeetingData): Promise<void> {
    await this.prisma.meeting.update({
      where: { id },
      data: {
        status: "ended",
        actualEndAt: data.actualEndAt,
        ...(data.actualStartAt ? { actualStartAt: data.actualStartAt } : {}),
        ...(data.attendeeEmails ? { attendeeEmails: data.attendeeEmails } : {}),
      },
    });
  }

  async saveRecordingData(id: string, data: SaveRecordingData): Promise<void> {
    await this.prisma.meeting.update({
      where: { id },
      data: {
        ...(data.recordingDriveId !== undefined ? { recordingDriveId: data.recordingDriveId } : {}),
        ...(data.recordingUrl !== undefined ? { recordingUrl: data.recordingUrl } : {}),
        ...(data.recordingMovedAt !== undefined ? { recordingMovedAt: data.recordingMovedAt } : {}),
        ...(data.nativeTranscriptUrl !== undefined ? { nativeTranscriptUrl: data.nativeTranscriptUrl } : {}),
        ...(data.meetingSummary !== undefined ? { meetingSummary: data.meetingSummary } : {}),
        ...(data.transcriptText !== undefined ? { transcriptText: data.transcriptText } : {}),
        ...(data.transcribedAt !== undefined ? { transcribedAt: data.transcribedAt } : {}),
        ...(data.transcriptionJobId !== undefined ? { transcriptionJobId: data.transcriptionJobId } : {}),
      },
    });
  }

  async saveTranscription(id: string, text: string): Promise<void> {
    await this.prisma.meeting.update({
      where: { id },
      data: { transcriptText: text, transcribedAt: new Date(), transcriptionJobId: null },
    });
  }

  async clearTranscriptionJob(id: string): Promise<void> {
    await this.prisma.meeting.update({
      where: { id },
      data: { transcriptionJobId: null },
    });
  }

  async completeActivity(activityId: string, at: Date): Promise<void> {
    await this.prisma.activity.update({
      where: { id: activityId },
      data: { completed: true, completedAt: at },
    });
  }

  private toDomain(row: {
    id: string; title: string; googleEventId: string | null; startAt: Date; endAt: Date | null;
    actualStartAt: Date | null; actualEndAt: Date | null; status: string; activityId: string | null;
    nativeTranscriptUrl: string | null; recordingDriveId: string | null;
  }): MeetingRecord {
    return {
      id: row.id, title: row.title, googleEventId: row.googleEventId, startAt: row.startAt,
      endAt: row.endAt, actualStartAt: row.actualStartAt, actualEndAt: row.actualEndAt,
      status: row.status, activityId: row.activityId, nativeTranscriptUrl: row.nativeTranscriptUrl,
      recordingDriveId: row.recordingDriveId,
    };
  }
}
