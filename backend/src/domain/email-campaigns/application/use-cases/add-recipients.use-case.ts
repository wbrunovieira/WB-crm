import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { EmailCampaignRecipient, RecipientType } from "../../enterprise/entities/email-campaign-recipient.entity";
import { EmailCampaignsRepository } from "../repositories/email-campaigns.repository";
import { EmailCampaignRecipientsRepository } from "../repositories/email-campaign-recipients.repository";

interface RecipientInput {
  recipientType: RecipientType;
  recipientId: string;
  email: string;
  name?: string;
  company?: string;
  role?: string;
  customVars?: Record<string, string>;
}

interface Input { campaignId: string; recipients: RecipientInput[]; }
interface Output { added: number; }

@Injectable()
export class AddRecipientsUseCase {
  constructor(
    private readonly campaigns: EmailCampaignsRepository,
    private readonly recipients: EmailCampaignRecipientsRepository,
  ) {}

  async execute(input: Input): Promise<Either<Error, Output>> {
    const campaign = await this.campaigns.findById(input.campaignId);
    if (!campaign) return left(new Error("Campaign not found"));

    const existing = await this.recipients.findByCampaign(input.campaignId);
    const existingKeys = new Set(existing.map((r) => `${r.recipientType}:${r.recipientId}`));

    const toAdd = input.recipients
      .filter((r) => !existingKeys.has(`${r.recipientType}:${r.recipientId}`))
      .map((r) => EmailCampaignRecipient.create({ ...r, campaignId: input.campaignId }));

    await this.recipients.saveMany(toAdd);
    return right({ added: toAdd.length });
  }
}
