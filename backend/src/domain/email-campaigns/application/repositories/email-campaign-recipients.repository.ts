import type { EmailCampaignRecipient } from "../../enterprise/entities/email-campaign-recipient.entity";

export abstract class EmailCampaignRecipientsRepository {
  abstract findByCampaign(campaignId: string): Promise<EmailCampaignRecipient[]>;
  abstract findById(id: string): Promise<EmailCampaignRecipient | null>;
  abstract findPendingForStep(campaignId: string, step: number): Promise<EmailCampaignRecipient[]>;
  abstract save(recipient: EmailCampaignRecipient): Promise<void>;
  abstract saveMany(recipients: EmailCampaignRecipient[]): Promise<void>;
  abstract deleteByCampaign(campaignId: string): Promise<void>;
}
