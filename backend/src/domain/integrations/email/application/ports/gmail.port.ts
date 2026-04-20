export interface GmailMessage {
  messageId: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  receivedAt: Date;
  inReplyTo?: string;
}

export abstract class GmailPort {
  abstract send(params: {
    userId: string;
    to: string;
    subject: string;
    bodyHtml: string;
    threadId?: string;
  }): Promise<{ messageId: string; threadId: string }>;

  abstract pollHistory(userId: string, historyId: string): Promise<GmailMessage[]>;

  abstract getProfile(userId: string): Promise<{ emailAddress: string; historyId: string }>;

  abstract getMessage(userId: string, messageId: string): Promise<GmailMessage | null>;
}
