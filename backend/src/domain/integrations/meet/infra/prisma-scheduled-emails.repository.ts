import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import {
  ScheduledEmailsRepository,
  ScheduledEmailRecord,
  CreateScheduledEmailInput,
} from "../application/repositories/scheduled-emails.repository";

@Injectable()
export class PrismaScheduledEmailsRepository extends ScheduledEmailsRepository {
  constructor(private readonly prisma: PrismaService) { super(); }

  async createMany(items: CreateScheduledEmailInput[]): Promise<void> {
    await this.prisma.scheduledEmail.createMany({
      data: items.map((i) => ({
        meetingId: i.meetingId,
        type: i.type,
        scheduledFor: i.scheduledFor,
        recipientEmail: i.recipientEmail,
        organizerEmail: i.organizerEmail ?? null,
        meetingTitle: i.meetingTitle,
        meetingStartAt: i.meetingStartAt,
        meetingEndAt: i.meetingEndAt ?? null,
        meetingDescription: i.meetingDescription ?? null,
        meetLink: i.meetLink ?? null,
        contactName: i.contactName ?? null,
        companyName: i.companyName ?? null,
      })),
    });
  }

  async findDue(now: Date, limit = 50): Promise<ScheduledEmailRecord[]> {
    const rows = await this.prisma.scheduledEmail.findMany({
      where: { scheduledFor: { lte: now }, status: "pending" },
      orderBy: { scheduledFor: "asc" },
      take: limit,
    });
    return rows.map(this.toRecord);
  }

  async markSent(id: string): Promise<void> {
    await this.prisma.scheduledEmail.update({
      where: { id },
      data: { status: "sent", sentAt: new Date() },
    });
  }

  async markFailed(id: string, reason: string): Promise<void> {
    await this.prisma.scheduledEmail.update({
      where: { id },
      data: { status: "failed", failReason: reason, attempts: { increment: 1 } },
    });
  }

  async cancelByMeetingId(meetingId: string): Promise<void> {
    await this.prisma.scheduledEmail.updateMany({
      where: { meetingId, status: "pending" },
      data: { status: "cancelled" },
    });
  }

  private toRecord(row: any): ScheduledEmailRecord {
    return {
      id: row.id,
      meetingId: row.meetingId,
      type: row.type,
      scheduledFor: row.scheduledFor,
      status: row.status,
      attempts: row.attempts,
      sentAt: row.sentAt,
      failReason: row.failReason,
      recipientEmail: row.recipientEmail,
      organizerEmail: row.organizerEmail,
      meetingTitle: row.meetingTitle,
      meetingStartAt: row.meetingStartAt,
      meetingEndAt: row.meetingEndAt,
      meetingDescription: row.meetingDescription,
      meetLink: row.meetLink,
      contactName: row.contactName,
      companyName: row.companyName,
      createdAt: row.createdAt,
    };
  }
}
