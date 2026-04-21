export interface WhatsAppMessageData {
  id: string;
  messageId: string;
  remoteJid: string;
  fromMe: boolean;
  messageType: string;
  pushName?: string | null;
  text?: string | null;
  mediaLabel?: string | null;
  mediaUrl?: string | null;
  mediaMimeType?: string | null;
  mediaDriveId?: string | null;
  mediaTranscriptionJobId?: string | null;
  mediaTranscriptText?: string | null;
  timestamp: Date;
  activityId?: string | null;
  ownerId: string;
}

export abstract class WhatsAppMessagesRepository {
  abstract findByMessageId(messageId: string): Promise<WhatsAppMessageData | null>;
  abstract findLastInSession(
    remoteJid: string,
    ownerId: string,
    windowMs: number,
  ): Promise<(WhatsAppMessageData & { activityDescription?: string | null }) | null>;
  abstract create(data: Omit<WhatsAppMessageData, "id">): Promise<WhatsAppMessageData>;
  abstract updateMedia(
    id: string,
    data: {
      mediaDriveId?: string;
      mediaUrl?: string;
      mediaMimeType?: string;
      mediaTranscriptionJobId?: string;
    },
  ): Promise<void>;
  abstract findPendingTranscriptions(
    ownerId?: string,
  ): Promise<Array<WhatsAppMessageData & { activityOwnerId: string }>>;
  abstract saveTranscript(id: string, text: string): Promise<void>;
  abstract findMediaByActivityId(activityId: string): Promise<WhatsAppMessageData[]>;
}
