import { GmailPort, GmailMessage, SendAsAlias } from "@/domain/integrations/email/application/ports/gmail.port";

export class FakeGmailPort extends GmailPort {
  public sentMessages: Array<{
    userId: string;
    to: string;
    subject: string;
    bodyHtml: string;
    from?: string;
    threadId?: string;
  }> = [];

  public sendAsAliases: SendAsAlias[] = [
    { email: "owner@example.com", displayName: "Owner", isDefault: true, isPrimary: true },
  ];

  public messages: Map<string, GmailMessage> = new Map();
  public historyMessages: GmailMessage[] = [];
  public profileHistoryId = "history-001";
  public profileEmail = "user@example.com";

  /** Simulate a send failure */
  public shouldFailSend = false;

  async send(params: {
    userId: string;
    to: string;
    subject: string;
    bodyHtml: string;
    from?: string;
    threadId?: string;
  }): Promise<{ messageId: string; threadId: string }> {
    if (this.shouldFailSend) {
      throw new Error("Gmail send failed (simulated)");
    }

    this.sentMessages.push(params);
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const threadId = params.threadId ?? `thread-${Date.now()}`;

    const message: GmailMessage = {
      messageId,
      threadId,
      from: `${params.userId}@example.com`,
      to: params.to,
      subject: params.subject,
      bodyText: params.bodyHtml.replace(/<[^>]*>/g, ""),
      bodyHtml: params.bodyHtml,
      receivedAt: new Date(),
    };
    this.messages.set(messageId, message);

    return { messageId, threadId };
  }

  async pollHistory(_userId: string, _historyId: string): Promise<GmailMessage[]> {
    return this.historyMessages;
  }

  async getProfile(_userId: string): Promise<{ emailAddress: string; historyId: string }> {
    return { emailAddress: this.profileEmail, historyId: this.profileHistoryId };
  }

  async getMessage(_userId: string, messageId: string): Promise<GmailMessage | null> {
    return this.messages.get(messageId) ?? null;
  }

  async getSendAsAliases(_userId: string): Promise<SendAsAlias[]> {
    return this.sendAsAliases;
  }

  /** Helper: add a message to be returned by pollHistory */
  addHistoryMessage(msg: GmailMessage): void {
    this.historyMessages.push(msg);
    this.messages.set(msg.messageId, msg);
  }
}
