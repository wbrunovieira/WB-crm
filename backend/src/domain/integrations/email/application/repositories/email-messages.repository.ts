export interface EmailMessage {
  id: string;
  gmailMessageId: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  bodyText?: string;
  activityId?: string;
  ownerId: string;
  sentAt: Date;
  trackingToken?: string;
  openedAt?: Date;
  openCount: number;
  lastClickedAt?: Date;
  clickCount: number;
}

export abstract class EmailMessagesRepository {
  abstract findByMessageId(messageId: string): Promise<EmailMessage | null>;
  abstract save(message: EmailMessage): Promise<void>;
  abstract findPendingTranscriptions(): Promise<EmailMessage[]>;
  abstract update(message: EmailMessage): Promise<void>;
  abstract findByOwnerId(ownerId: string): Promise<EmailMessage[]>;
}
