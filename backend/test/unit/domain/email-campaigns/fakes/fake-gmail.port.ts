import { GmailPort, type GmailMessage, type GmailAttachment, type SendAsAlias, type CalendarInviteParams } from "@/domain/integrations/email/application/ports/gmail.port";

export class FakeGmailPortForCampaigns extends GmailPort {
  sentEmails: { to: string; subject: string; bodyHtml: string; from?: string }[] = [];
  shouldFail = false;

  async send(params: {
    userId: string; to: string; subject: string; bodyHtml: string;
    from?: string; replyTo?: string; cc?: string; threadId?: string;
    attachments?: GmailAttachment[];
  }) {
    if (this.shouldFail) throw new Error("Gmail send failed");
    this.sentEmails.push({ to: params.to, subject: params.subject, bodyHtml: params.bodyHtml, from: params.from });
    return { messageId: `msg-${Date.now()}`, threadId: `thread-${Date.now()}` };
  }

  async pollHistory(_userId: string, _historyId: string): Promise<GmailMessage[]> { return []; }
  async getProfile(_userId: string) { return { emailAddress: "fake@example.com", historyId: "0" }; }
  async getMessage(_userId: string, _messageId: string): Promise<GmailMessage | null> { return null; }
  async getSendAsAliases(_userId: string): Promise<SendAsAlias[]> { return []; }
  async sendCalendarInvite(_params: CalendarInviteParams): Promise<void> {}
  async trashMessage(_userId: string, _messageId: string): Promise<void> {}
}
