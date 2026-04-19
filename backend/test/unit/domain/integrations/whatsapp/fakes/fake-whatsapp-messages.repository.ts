import {
  WhatsAppMessagesRepository,
  WhatsAppMessageData,
} from "@/domain/integrations/whatsapp/application/repositories/whatsapp-messages.repository";
import { randomUUID } from "crypto";

export class FakeWhatsAppMessagesRepository extends WhatsAppMessagesRepository {
  public items: WhatsAppMessageData[] = [];

  async findByMessageId(messageId: string): Promise<WhatsAppMessageData | null> {
    return this.items.find((m) => m.messageId === messageId) ?? null;
  }

  async findLastInSession(
    remoteJid: string,
    ownerId: string,
    windowMs: number,
  ): Promise<(WhatsAppMessageData & { activityDescription?: string | null }) | null> {
    const windowStart = new Date(Date.now() - windowMs);
    const matches = this.items
      .filter(
        (m) =>
          m.remoteJid === remoteJid &&
          m.ownerId === ownerId &&
          m.timestamp >= windowStart,
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (!matches[0]) return null;
    return { ...matches[0], activityDescription: null };
  }

  async create(data: Omit<WhatsAppMessageData, "id">): Promise<WhatsAppMessageData> {
    const item: WhatsAppMessageData = { id: randomUUID(), ...data };
    this.items.push(item);
    return item;
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
    const idx = this.items.findIndex((m) => m.id === id);
    if (idx >= 0) {
      Object.assign(this.items[idx], data);
    }
  }

  async findPendingTranscriptions(
    _ownerId?: string,
  ): Promise<Array<WhatsAppMessageData & { activityOwnerId: string }>> {
    return this.items
      .filter((m) => m.mediaTranscriptionJobId && !m.mediaTranscriptText)
      .map((m) => ({ ...m, activityOwnerId: m.ownerId }));
  }

  async saveTranscript(id: string, text: string): Promise<void> {
    const idx = this.items.findIndex((m) => m.id === id);
    if (idx >= 0) {
      this.items[idx].mediaTranscriptText = text;
      this.items[idx].mediaTranscriptionJobId = null;
    }
  }
}
