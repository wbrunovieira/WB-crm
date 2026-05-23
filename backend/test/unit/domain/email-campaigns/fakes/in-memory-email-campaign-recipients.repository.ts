import type { EmailCampaignRecipientsRepository } from "@/domain/email-campaigns/application/repositories/email-campaign-recipients.repository";
import type { EmailCampaignRecipient } from "@/domain/email-campaigns/enterprise/entities/email-campaign-recipient.entity";

export class InMemoryEmailCampaignRecipientsRepository implements EmailCampaignRecipientsRepository {
  items: EmailCampaignRecipient[] = [];

  async findByCampaign(campaignId: string) {
    return this.items.filter((r) => r.campaignId === campaignId);
  }

  async findById(id: string) {
    return this.items.find((r) => r.id.toString() === id) ?? null;
  }

  async findPendingForStep(campaignId: string, step: number) {
    return this.items.filter(
      (r) => r.campaignId === campaignId && r.currentStep === step && (r.status === "PENDING" || r.status === "ACTIVE"),
    );
  }

  async save(recipient: EmailCampaignRecipient) {
    const idx = this.items.findIndex((r) => r.id.equals(recipient.id));
    if (idx >= 0) this.items[idx] = recipient;
    else this.items.push(recipient);
  }

  async saveMany(recipients: EmailCampaignRecipient[]) {
    for (const r of recipients) await this.save(r);
  }

  async deleteByCampaign(campaignId: string) {
    this.items = this.items.filter((r) => r.campaignId !== campaignId);
  }
}
