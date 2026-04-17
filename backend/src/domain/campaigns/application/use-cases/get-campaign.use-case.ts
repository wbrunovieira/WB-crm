import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { CampaignsRepository } from "../repositories/campaigns.repository";
import { CampaignSendsRepository } from "../repositories/campaign-sends.repository";
import type { Campaign } from "../../enterprise/entities/campaign";
import type { CampaignSend } from "../../enterprise/entities/campaign-send";

interface Input { campaignId: string; ownerId: string }
type Output = Either<Error, { campaign: Campaign; sends: CampaignSend[] }>;

@Injectable()
export class GetCampaignUseCase {
  constructor(
    private readonly campaigns: CampaignsRepository,
    private readonly sends: CampaignSendsRepository,
  ) {}

  async execute({ campaignId, ownerId }: Input): Promise<Output> {
    const campaign = await this.campaigns.findById(campaignId);
    if (!campaign)                     return left(new Error("Campanha não encontrada"));
    if (campaign.ownerId !== ownerId)  return left(new Error("Não autorizado"));
    const sends = await this.sends.findManyByCampaign(campaignId);
    return right({ campaign, sends });
  }
}
