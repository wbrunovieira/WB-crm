import { GmailPort, GmailMessage, SendAsAlias, CalendarInviteParams } from "@/domain/integrations/email/application/ports/gmail.port";

export class FakeGmailPort extends GmailPort {
  sentEmails: Array<{
    userId: string;
    to: string;
    subject: string;
    bodyHtml: string;
    from?: string;
    threadId?: string;
  }> = [];

  async send(params: {
    userId: string;
    to: string;
    subject: string;
    bodyHtml: string;
    from?: string;
    replyTo?: string;
    cc?: string;
    threadId?: string;
  }): Promise<{ messageId: string; threadId: string }> {
    this.sentEmails.push(params);
    return {
      messageId: `msg-${this.sentEmails.length}`,
      threadId: params.threadId ?? `thread-${this.sentEmails.length}`,
    };
  }

  async pollHistory(_userId: string, _historyId: string): Promise<GmailMessage[]> {
    return [];
  }

  async getProfile(_userId: string): Promise<{ emailAddress: string; historyId: string }> {
    return { emailAddress: "test@example.com", historyId: "12345" };
  }

  async getMessage(_userId: string, _messageId: string): Promise<GmailMessage | null> {
    return null;
  }

  async getSendAsAliases(_userId: string): Promise<SendAsAlias[]> {
    return [];
  }

  async sendCalendarInvite(_params: CalendarInviteParams): Promise<void> {}

  async trashMessage(_userId: string, _messageId: string): Promise<void> {}
}
