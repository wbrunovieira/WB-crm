import type { EmailCampaign } from "../../enterprise/entities/email-campaign.entity";

export abstract class EmailCampaignsRepository {
  abstract findById(id: string): Promise<EmailCampaign | null>;
  abstract findAllByOwner(ownerId: string): Promise<EmailCampaign[]>;
  abstract save(campaign: EmailCampaign): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
