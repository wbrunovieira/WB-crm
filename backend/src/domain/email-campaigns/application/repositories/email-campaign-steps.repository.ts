import type { EmailCampaignStep } from "../../enterprise/entities/email-campaign-step.entity";

export abstract class EmailCampaignStepsRepository {
  abstract findByCampaign(campaignId: string): Promise<EmailCampaignStep[]>;
  abstract findById(id: string): Promise<EmailCampaignStep | null>;
  abstract save(step: EmailCampaignStep): Promise<void>;
  abstract deleteByCampaign(campaignId: string): Promise<void>;
}
