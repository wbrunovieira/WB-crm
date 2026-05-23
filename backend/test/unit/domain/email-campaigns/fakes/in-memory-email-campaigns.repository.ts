import type { EmailCampaignsRepository } from "@/domain/email-campaigns/application/repositories/email-campaigns.repository";
import type { EmailCampaign } from "@/domain/email-campaigns/enterprise/entities/email-campaign.entity";

export class InMemoryEmailCampaignsRepository implements EmailCampaignsRepository {
  items: EmailCampaign[] = [];

  async findById(id: string) {
    return this.items.find((c) => c.id.toString() === id) ?? null;
  }

  async findAllByOwner(ownerId: string) {
    return this.items.filter((c) => c.ownerId === ownerId);
  }

  async save(campaign: EmailCampaign) {
    const idx = this.items.findIndex((c) => c.id.equals(campaign.id));
    if (idx >= 0) this.items[idx] = campaign;
    else this.items.push(campaign);
  }

  async delete(id: string) {
    this.items = this.items.filter((c) => c.id.toString() !== id);
  }
}
