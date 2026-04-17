import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { CampaignsRepository } from "../repositories/campaigns.repository";
import { CampaignSendsRepository } from "../repositories/campaign-sends.repository";

interface Input {
  campaignId: string;
  ownerId: string;
}

type Output = Either<Error, void>;

@Injectable()
export class StartCampaignUseCase {
  constructor(
    private readonly campaigns: CampaignsRepository,
    private readonly sends: CampaignSendsRepository,
  ) {}

  async execute({ campaignId, ownerId }: Input): Promise<Output> {
    const campaign = await this.campaigns.findById(campaignId);
    if (!campaign) {
      return left(new Error("Campanha não encontrada"));
    }
    if (campaign.ownerId !== ownerId) {
      return left(new Error("Não autorizado"));
    }
    if (campaign.status === "ACTIVE") {
      return left(new Error("A campanha já está ativa"));
    }
    if (campaign.status === "FINISHED") {
      return left(new Error("Não é possível reiniciar uma campanha finalizada"));
    }

    const count = await this.sends.countByCampaign(campaignId);
    if (count === 0) {
      return left(new Error("A campanha precisa ter pelo menos um destinatário"));
    }

    campaign.start();
    await this.campaigns.save(campaign);
    return right(undefined);
  }
}
