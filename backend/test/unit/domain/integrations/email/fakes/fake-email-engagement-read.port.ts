import { EmailEngagementReadPort, EmailEngagementContext } from "@/domain/integrations/email/application/ports/email-engagement-read.port";

export class FakeEmailEngagementReadPort extends EmailEngagementReadPort {
  context: EmailEngagementContext | null = null;

  async findContextByToken(): Promise<EmailEngagementContext | null> {
    return this.context;
  }
}
