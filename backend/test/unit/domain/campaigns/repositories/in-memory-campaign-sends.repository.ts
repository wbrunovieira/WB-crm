import { CampaignSendsRepository } from "@/domain/campaigns/application/repositories/campaign-sends.repository";
import type { CampaignSend } from "@/domain/campaigns/enterprise/entities/campaign-send";

export class InMemoryCampaignSendsRepository extends CampaignSendsRepository {
  public items: CampaignSend[] = [];

  async findById(id: string): Promise<CampaignSend | null> {
    return this.items.find((s) => s.id.toString() === id) ?? null;
  }

  async findManyByCampaign(campaignId: string): Promise<CampaignSend[]> {
    return this.items.filter((s) => s.campaignId === campaignId);
  }

  async findDueForExecution(limit: number): Promise<CampaignSend[]> {
    const now = new Date();
    return this.items
      .filter(
        (s) =>
          (s.status === "PENDING" || s.status === "RUNNING") &&
          (!s.scheduledAt || s.scheduledAt <= now)
      )
      .slice(0, limit);
  }

  async save(send: CampaignSend): Promise<void> {
    const idx = this.items.findIndex((s) => s.id.equals(send.id));
    if (idx >= 0) {
      this.items[idx] = send;
    } else {
      this.items.push(send);
    }
  }

  async saveMany(sends: CampaignSend[]): Promise<void> {
    for (const send of sends) {
      await this.save(send);
    }
  }

  async countByCampaign(campaignId: string): Promise<number> {
    return this.items.filter((s) => s.campaignId === campaignId).length;
  }
}
