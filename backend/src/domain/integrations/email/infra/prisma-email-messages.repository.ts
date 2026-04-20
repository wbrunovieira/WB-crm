import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import {
  EmailMessagesRepository,
  EmailMessage,
} from "../application/repositories/email-messages.repository";

@Injectable()
export class PrismaEmailMessagesRepository extends EmailMessagesRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByMessageId(messageId: string): Promise<EmailMessage | null> {
    const row = await this.prisma.emailMessage.findUnique({
      where: { gmailMessageId: messageId },
    });
    return row ? this.toDomain(row) : null;
  }

  async save(message: EmailMessage): Promise<void> {
    await this.prisma.emailMessage.upsert({
      where: { gmailMessageId: message.gmailMessageId },
      create: this.toPrismaCreate(message),
      update: this.toPrismaUpdate(message),
    });
  }

  async update(message: EmailMessage): Promise<void> {
    await this.prisma.emailMessage.update({
      where: { gmailMessageId: message.gmailMessageId },
      data: this.toPrismaUpdate(message),
    });
  }

  async findByOwnerId(ownerId: string): Promise<EmailMessage[]> {
    const rows = await this.prisma.emailMessage.findMany({
      where: { ownerId },
      orderBy: { sentAt: "desc" },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async findPendingTranscriptions(): Promise<EmailMessage[]> {
    // Reserved for future audio-in-email transcription flow
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDomain(row: any): EmailMessage {
    return {
      id: row.id,
      gmailMessageId: row.gmailMessageId,
      threadId: row.threadId,
      from: row.from,
      to: row.to,
      subject: row.subject,
      bodyText: row.bodyText ?? undefined,
      activityId: row.activityId ?? undefined,
      ownerId: row.ownerId,
      sentAt: row.sentAt,
      trackingToken: row.trackingToken ?? undefined,
      openedAt: row.openedAt ?? undefined,
      openCount: row.openCount,
      lastClickedAt: row.lastClickedAt ?? undefined,
      clickCount: row.clickCount,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toPrismaCreate(m: EmailMessage): any {
    return {
      id: m.id,
      gmailMessageId: m.gmailMessageId,
      threadId: m.threadId,
      from: m.from,
      to: m.to,
      subject: m.subject,
      bodyText: m.bodyText ?? null,
      activityId: m.activityId ?? null,
      ownerId: m.ownerId,
      sentAt: m.sentAt,
      trackingToken: m.trackingToken ?? null,
      openedAt: m.openedAt ?? null,
      openCount: m.openCount,
      lastClickedAt: m.lastClickedAt ?? null,
      clickCount: m.clickCount,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toPrismaUpdate(m: EmailMessage): any {
    return {
      threadId: m.threadId,
      subject: m.subject,
      bodyText: m.bodyText ?? null,
      activityId: m.activityId ?? null,
      trackingToken: m.trackingToken ?? null,
      openedAt: m.openedAt ?? null,
      openCount: m.openCount,
      lastClickedAt: m.lastClickedAt ?? null,
      clickCount: m.clickCount,
    };
  }
}
