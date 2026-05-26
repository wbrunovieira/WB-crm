import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { EmailCampaignsRepository } from "../repositories/email-campaigns.repository";
import { EmailCampaignRecipientsRepository } from "../repositories/email-campaign-recipients.repository";

interface Input {
  campaignId: string;
  ownerId: string;
}

@Injectable()
export class ClearCampaignRecipientsUseCase {
  constructor(
    private readonly campaigns: EmailCampaignsRepository,
    private readonly recipients: EmailCampaignRecipientsRepository,
  ) {}

  async execute(input: Input): Promise<Either<Error, { deleted: number }>> {
    const campaign = await this.campaigns.findById(input.campaignId);
    if (!campaign) return left(new Error("Campaign not found"));
    if (campaign.ownerId !== input.ownerId) return left(new Error("Forbidden"));
    if (campaign.status === "ACTIVE") return left(new Error("Cannot clear recipients of an active campaign"));

    const existing = await this.recipients.findByCampaign(input.campaignId);
    await this.recipients.deleteByCampaign(input.campaignId);

    return right({ deleted: existing.length });
  }
}
