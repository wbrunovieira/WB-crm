import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { EmailCampaign } from "../../enterprise/entities/email-campaign.entity";
import { EmailCampaignsRepository } from "../repositories/email-campaigns.repository";

interface Input { name: string; description?: string; fromEmail: string; ownerId: string; }
export interface Output { id: string; }

@Injectable()
export class CreateEmailCampaignUseCase {
  constructor(private readonly campaigns: EmailCampaignsRepository) {}

  async execute(input: Input): Promise<Either<never, Output>> {
    const campaign = EmailCampaign.create({ ...input, status: "DRAFT" });
    await this.campaigns.save(campaign);
    return right({ id: campaign.id.toString() });
  }
}
