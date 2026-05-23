import type { EmailCampaignSendsRepository } from "@/domain/email-campaigns/application/repositories/email-campaign-sends.repository";
import type { EmailCampaignSend } from "@/domain/email-campaigns/enterprise/entities/email-campaign-send.entity";

export class InMemoryEmailCampaignSendsRepository implements EmailCampaignSendsRepository {
  items: EmailCampaignSend[] = [];

  async findById(id: string) {
    return this.items.find((s) => s.id.toString() === id) ?? null;
  }

  async findByRecipient(recipientId: string) {
    return this.items.filter((s) => s.recipientId === recipientId);
  }

  async countByStep(stepId: string) {
    const sends = this.items.filter((s) => s.stepId === stepId);
    return {
      sent: sends.length,
      opened: sends.filter((s) => s.openedAt).length,
      clicked: sends.filter((s) => s.clickedAt).length,
    };
  }

  async save(send: EmailCampaignSend) {
    const idx = this.items.findIndex((s) => s.id.equals(send.id));
    if (idx >= 0) this.items[idx] = send;
    else this.items.push(send);
  }
}
