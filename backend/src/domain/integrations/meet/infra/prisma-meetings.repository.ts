import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import {
  MeetingsRepository,
  MeetingRecord,
  MeetingTranscriptionRecord,
  EndMeetingData,
  SaveRecordingData,
  CreateMeetingData,
  UpdateMeetingData,
} from "../application/repositories/meetings.repository";
import { UniqueEntityID } from "@/core/unique-entity-id";

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

  async findById(id: string): Promise<MeetingRecord | null> {
    const row = await this.prisma.meeting.findUnique({ where: { id } });
    return row ? this.toDomain(row as any) : null;
  }

  async findByOwner(ownerId: string): Promise<MeetingRecord[]> {
    const rows = await this.prisma.meeting.findMany({
      where: { ownerId },
      orderBy: { startAt: "desc" },
    });
    return rows.map(r => this.toDomain(r as any));
  }

  async create(data: CreateMeetingData): Promise<MeetingRecord> {
    const row = await this.prisma.meeting.create({
      data: {
        id: new UniqueEntityID().toString(),
        title: data.title,
        startAt: data.startAt,
        endAt: data.endAt,
        attendeeEmails: JSON.stringify(data.attendeeEmails),
        googleEventId: data.googleEventId,
        meetLink: data.meetLink,
        leadId: data.leadId,
        contactId: data.contactId,
        organizationId: data.organizationId,
        dealId: data.dealId,
        ownerId: data.ownerId,
      },
    });
    return this.toDomain(row as any);
  }

  async update(id: string, data: UpdateMeetingData): Promise<MeetingRecord> {
    const row = await this.prisma.meeting.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.startAt !== undefined ? { startAt: data.startAt } : {}),
        ...(data.endAt !== undefined ? { endAt: data.endAt } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.attendeeEmails !== undefined ? { attendeeEmails: JSON.stringify(data.attendeeEmails) } : {}),
      },
    });
    return this.toDomain(row as any);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.meeting.delete({ where: { id } });
  }

  private toDomain(row: any): MeetingRecord {
    return {
      id: row.id, title: row.title, googleEventId: row.googleEventId ?? null,
      meetLink: row.meetLink ?? null, startAt: row.startAt, endAt: row.endAt ?? null,
      actualStartAt: row.actualStartAt ?? null, actualEndAt: row.actualEndAt ?? null,
      attendeeEmails: row.attendeeEmails ?? "[]", status: row.status,
      activityId: row.activityId ?? null, nativeTranscriptUrl: row.nativeTranscriptUrl ?? null,
      recordingDriveId: row.recordingDriveId ?? null, leadId: row.leadId ?? null,
      contactId: row.contactId ?? null, organizationId: row.organizationId ?? null,
      dealId: row.dealId ?? null, ownerId: row.ownerId, createdAt: row.createdAt, updatedAt: row.updatedAt,
    };
  }
}
