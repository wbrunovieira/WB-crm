import type { GmailPort } from "@/domain/integrations/email/application/ports/gmail.port";

export class FakeGmailPortForCampaigns implements GmailPort {
  sentEmails: { to: string; subject: string; bodyHtml: string; from: string }[] = [];
  shouldFail = false;

  async send(params: { userId: string; to: string; subject: string; bodyHtml: string; from: string; threadId?: string }) {
    if (this.shouldFail) throw new Error("Gmail send failed");
    this.sentEmails.push({ to: params.to, subject: params.subject, bodyHtml: params.bodyHtml, from: params.from });
    return { messageId: `msg-${Date.now()}`, threadId: `thread-${Date.now()}` };
  }
}
