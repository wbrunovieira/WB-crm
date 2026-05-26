import type { EmailCampaignSend } from "../../enterprise/entities/email-campaign-send.entity";

export abstract class EmailCampaignSendsRepository {
  abstract findById(id: string): Promise<EmailCampaignSend | null>;
  abstract findByRecipient(recipientId: string): Promise<EmailCampaignSend[]>;
  abstract existsByRecipientAndStep(recipientId: string, stepId: string): Promise<boolean>;
  abstract countByStep(stepId: string): Promise<{ sent: number; opened: number; clicked: number }>;
  abstract aggregateByCampaign(campaignId: string): Promise<{ totalSent: number; uniqueOpened: number; uniqueClicked: number }>;
  abstract save(send: EmailCampaignSend): Promise<void>;
}
