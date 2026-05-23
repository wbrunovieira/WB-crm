import type { EmailCampaignStepsRepository } from "@/domain/email-campaigns/application/repositories/email-campaign-steps.repository";
import type { EmailCampaignStep } from "@/domain/email-campaigns/enterprise/entities/email-campaign-step.entity";

export class InMemoryEmailCampaignStepsRepository implements EmailCampaignStepsRepository {
  items: EmailCampaignStep[] = [];

  async findByCampaign(campaignId: string) {
    return this.items.filter((s) => s.campaignId === campaignId).sort((a, b) => a.order - b.order);
  }

  async findById(id: string) {
    return this.items.find((s) => s.id.toString() === id) ?? null;
  }

  async save(step: EmailCampaignStep) {
    const idx = this.items.findIndex((s) => s.id.equals(step.id));
    if (idx >= 0) this.items[idx] = step;
    else this.items.push(step);
  }

  async deleteByCampaign(campaignId: string) {
    this.items = this.items.filter((s) => s.campaignId !== campaignId);
  }
}
