import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { CampaignsRepository } from "../repositories/campaigns.repository";

interface Input { campaignId: string; ownerId: string; }
type Output = Either<Error, void>;

@Injectable()
export class PauseCampaignUseCase {
  constructor(private readonly campaigns: CampaignsRepository) {}

  async execute({ campaignId, ownerId }: Input): Promise<Output> {
    const campaign = await this.campaigns.findById(campaignId);
    if (!campaign)              return left(new Error("Campanha não encontrada"));
    if (campaign.ownerId !== ownerId) return left(new Error("Não autorizado"));
    if (campaign.status !== "ACTIVE") return left(new Error("Só é possível pausar campanhas ativas"));

    campaign.pause();
    await this.campaigns.save(campaign);
    return right(undefined);
  }
}
