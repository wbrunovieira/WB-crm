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

export interface GmailAttachment {
  filename: string;
  mimeType: string;
  data: string;
}

export interface SendAsAlias {
  email: string;
  displayName: string;
  isDefault: boolean;
  isPrimary: boolean;
}

export interface CalendarInviteParams {
  userId: string;
  to: string;
  subject: string;
  bodyHtml: string;
  from: string;
  organizerEmail: string;
  attendeeEmails: string[];
  startAt: Date;
  endAt: Date;
  title: string;
  description?: string;
  googleEventId?: string;
  meetLink?: string;
  timeZone?: string;
}

export abstract class GmailPort {
  abstract send(params: {
    userId: string;
    to: string;
    subject: string;
    bodyHtml: string;
    from?: string;
    replyTo?: string;
    cc?: string;
    threadId?: string;
    attachments?: GmailAttachment[];
  }): Promise<{ messageId: string; threadId: string }>;

  abstract pollHistory(userId: string, historyId: string): Promise<GmailMessage[]>;

  abstract getProfile(userId: string): Promise<{ emailAddress: string; historyId: string }>;

  abstract getMessage(userId: string, messageId: string): Promise<GmailMessage | null>;

  abstract getSendAsAliases(userId: string): Promise<SendAsAlias[]>;

  abstract sendCalendarInvite(params: CalendarInviteParams): Promise<void>;

  abstract trashMessage(userId: string, messageId: string): Promise<void>;
}
