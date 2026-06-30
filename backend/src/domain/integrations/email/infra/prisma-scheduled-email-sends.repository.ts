import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { ScheduledEmailSendsRepository } from "../application/repositories/scheduled-email-sends.repository";
import {
  ScheduledEmailSend,
  ScheduledEmailAttachment,
  ScheduledEmailStatus,
} from "../enterprise/entities/scheduled-email-send";

@Injectable()
export class PrismaScheduledEmailSendsRepository extends ScheduledEmailSendsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async save(scheduled: ScheduledEmailSend): Promise<void> {
    const data = this.toPrisma(scheduled);
    await this.prisma.scheduledEmailSend.upsert({
      where: { id: scheduled.id.toString() },
      create: data,
      update: data,
    });
  }

  async findById(id: string): Promise<ScheduledEmailSend | null> {
    const row = await this.prisma.scheduledEmailSend.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByActivityId(activityId: string): Promise<ScheduledEmailSend | null> {
    const row = await this.prisma.scheduledEmailSend.findUnique({ where: { activityId } });
    return row ? this.toDomain(row) : null;
  }

  async findDue(now: Date, limit: number): Promise<ScheduledEmailSend[]> {
    const rows = await this.prisma.scheduledEmailSend.findMany({
      where: { status: "PENDING", scheduledSendAt: { lte: now } },
      orderBy: { scheduledSendAt: "asc" },
      take: limit,
    });
    return rows.map((r) => this.toDomain(r));
  }

  async findPendingByLeadOrContact(input: {
    leadId?: string | null;
    contactId?: string | null;
  }): Promise<ScheduledEmailSend[]> {
    const or: Array<{ leadId?: string; contactId?: string }> = [];
    if (input.leadId) or.push({ leadId: input.leadId });
    if (input.contactId) or.push({ contactId: input.contactId });
    if (or.length === 0) return [];

    const rows = await this.prisma.scheduledEmailSend.findMany({
      where: { status: "PENDING", OR: or },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async findPendingByOwner(ownerId: string): Promise<ScheduledEmailSend[]> {
    const rows = await this.prisma.scheduledEmailSend.findMany({
      where: { status: "PENDING", ownerId },
      orderBy: { scheduledSendAt: "asc" },
    });
    return rows.map((r) => this.toDomain(r));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDomain(row: any): ScheduledEmailSend {
    const attachments: ScheduledEmailAttachment[] = row.attachmentsJson
      ? JSON.parse(row.attachmentsJson)
      : [];
    const contactIds: string[] = row.contactIdsJson ? JSON.parse(row.contactIdsJson) : [];

    return ScheduledEmailSend.fromPersistence(
      {
        ownerId: row.ownerId,
        activityId: row.activityId ?? null,
        status: row.status as ScheduledEmailStatus,
        scheduledSendAt: row.scheduledSendAt,
        to: row.to,
        subject: row.subject,
        bodyHtml: row.bodyHtml,
        fromEmail: row.fromEmail ?? null,
        threadId: row.threadId ?? null,
        attachments,
        leadId: row.leadId ?? null,
        contactId: row.contactId ?? null,
        contactIds,
        organizationId: row.organizationId ?? null,
        dealId: row.dealId ?? null,
        sentMessageId: row.sentMessageId ?? null,
        sentThreadId: row.sentThreadId ?? null,
        failReason: row.failReason ?? null,
        createdAt: row.createdAt,
        sentAt: row.sentAt ?? null,
        cancelledAt: row.cancelledAt ?? null,
      },
      new UniqueEntityID(row.id),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toPrisma(s: ScheduledEmailSend): any {
    return {
      id: s.id.toString(),
      ownerId: s.ownerId,
      activityId: s.activityId ?? null,
      status: s.status,
      scheduledSendAt: s.scheduledSendAt,
      to: s.to,
      subject: s.subject,
      bodyHtml: s.bodyHtml,
      fromEmail: s.fromEmail ?? null,
      threadId: s.threadId ?? null,
      attachmentsJson: s.attachments.length > 0 ? JSON.stringify(s.attachments) : null,
      leadId: s.leadId ?? null,
      contactId: s.contactId ?? null,
      contactIdsJson: s.contactIds.length > 0 ? JSON.stringify(s.contactIds) : null,
      organizationId: s.organizationId ?? null,
      dealId: s.dealId ?? null,
      sentMessageId: s.sentMessageId ?? null,
      sentThreadId: s.sentThreadId ?? null,
      failReason: s.failReason ?? null,
      createdAt: s.createdAt,
      sentAt: s.sentAt ?? null,
      cancelledAt: s.cancelledAt ?? null,
    };
  }
}
