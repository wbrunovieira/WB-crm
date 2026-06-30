import { ScheduledEmailSendsRepository } from "@/domain/integrations/email/application/repositories/scheduled-email-sends.repository";
import { ScheduledEmailSend } from "@/domain/integrations/email/enterprise/entities/scheduled-email-send";

export class InMemoryScheduledEmailSendsRepository extends ScheduledEmailSendsRepository {
  items: ScheduledEmailSend[] = [];

  async save(s: ScheduledEmailSend): Promise<void> {
    const i = this.items.findIndex((x) => x.id.equals(s.id));
    if (i >= 0) this.items[i] = s;
    else this.items.push(s);
  }

  async findById(id: string): Promise<ScheduledEmailSend | null> {
    return this.items.find((x) => x.id.toString() === id) ?? null;
  }

  async findDue(now: Date, limit: number): Promise<ScheduledEmailSend[]> {
    return this.items
      .filter((x) => x.isPending && x.scheduledSendAt.getTime() <= now.getTime())
      .sort((a, b) => a.scheduledSendAt.getTime() - b.scheduledSendAt.getTime())
      .slice(0, limit);
  }

  async findPendingByLeadOrContact(input: { leadId?: string | null; contactId?: string | null }): Promise<ScheduledEmailSend[]> {
    return this.items.filter(
      (x) => x.isPending && (((!!input.leadId && x.leadId === input.leadId)) || ((!!input.contactId && x.contactId === input.contactId))),
    );
  }

  async findPendingByOwner(ownerId: string): Promise<ScheduledEmailSend[]> {
    return this.items
      .filter((x) => x.isPending && x.ownerId === ownerId)
      .sort((a, b) => a.scheduledSendAt.getTime() - b.scheduledSendAt.getTime());
  }
}
