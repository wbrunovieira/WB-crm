import { CampaignsRepository } from "@/domain/campaigns/application/repositories/campaigns.repository";
import type { Campaign } from "@/domain/campaigns/enterprise/entities/campaign";

export class InMemoryCampaignsRepository extends CampaignsRepository {
  public items: Campaign[] = [];

  async findById(id: string): Promise<Campaign | null> {
    return this.items.find((c) => c.id.toString() === id) ?? null;
  }

  async findManyByOwner(ownerId: string): Promise<Campaign[]> {
    return this.items.filter((c) => c.ownerId === ownerId);
  }

  async save(campaign: Campaign): Promise<void> {
    const idx = this.items.findIndex((c) => c.id.equals(campaign.id));
    if (idx >= 0) {
      this.items[idx] = campaign;
    } else {
      this.items.push(campaign);
    }
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((c) => c.id.toString() !== id);
  }
}
