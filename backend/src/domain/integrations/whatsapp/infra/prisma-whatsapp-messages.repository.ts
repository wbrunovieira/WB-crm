import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import {
  WhatsAppMessagesRepository,
  WhatsAppMessageData,
} from "../application/repositories/whatsapp-messages.repository";

@Injectable()
export class PrismaWhatsAppMessagesRepository extends WhatsAppMessagesRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByMessageId(messageId: string): Promise<WhatsAppMessageData | null> {
    const msg = await this.prisma.whatsAppMessage.findUnique({
      where: { messageId },
    });
    return msg ?? null;
  }

  async findLastInSession(
    remoteJid: string,
    ownerId: string,
    windowMs: number,
  ): Promise<(WhatsAppMessageData & { activityDescription?: string | null }) | null> {
    const windowStart = new Date(Date.now() - windowMs);
    const msg = await this.prisma.whatsAppMessage.findFirst({
      where: {
        remoteJid,
        ownerId,
        timestamp: { gte: windowStart },
      },
      orderBy: { timestamp: "desc" },
      include: {
        activity: { select: { description: true } },
      },
    });

    if (!msg) return null;

    const { activity, ...rest } = msg as typeof msg & { activity?: { description?: string | null } | null };
    return {
      ...rest,
      activityDescription: activity?.description ?? null,
    };
  }

  async create(data: Omit<WhatsAppMessageData, "id">): Promise<WhatsAppMessageData> {
    const msg = await this.prisma.whatsAppMessage.create({ data });
    return msg;
  }

  async updateMedia(
    id: string,
    data: {
      mediaDriveId?: string;
      mediaUrl?: string;
      mediaMimeType?: string;
      mediaTranscriptionJobId?: string;
    },
  ): Promise<void> {
    await this.prisma.whatsAppMessage.update({ where: { id }, data });
  }

  async findPendingTranscriptions(
    ownerId?: string,
  ): Promise<Array<WhatsAppMessageData & { activityOwnerId: string }>> {
    const msgs = await this.prisma.whatsAppMessage.findMany({
      where: {
        mediaTranscriptionJobId: { not: null },
        mediaTranscriptText: null,
        ...(ownerId ? { ownerId } : {}),
      },
      select: {
        id: true,
        messageId: true,
        remoteJid: true,
        fromMe: true,
        messageType: true,
        pushName: true,
        text: true,
        mediaLabel: true,
        mediaUrl: true,
        mediaMimeType: true,
        mediaDriveId: true,
        mediaTranscriptionJobId: true,
        mediaTranscriptText: true,
        timestamp: true,
        activityId: true,
        ownerId: true,
      },
    });

    return msgs.map((m) => ({ ...m, activityOwnerId: m.ownerId }));
  }

  async saveTranscript(id: string, text: string): Promise<void> {
    await this.prisma.whatsAppMessage.update({
      where: { id },
      data: {
        mediaTranscriptText: text || null,
        mediaTranscriptionJobId: null,
      },
    });
  }
}
