import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { CampaignsRepository } from "../repositories/campaigns.repository";
import { CampaignSendsRepository } from "../repositories/campaign-sends.repository";
import type { SendStatus } from "../../enterprise/entities/campaign-send";

interface Input { campaignId: string; ownerId: string }

interface Stats {
  total: number;
  byStatus: Record<SendStatus, number>;
}

type Output = Either<Error, { stats: Stats }>;

@Injectable()
export class GetCampaignStatsUseCase {
  constructor(
    private readonly campaigns: CampaignsRepository,
    private readonly sends: CampaignSendsRepository,
  ) {}

  async execute({ campaignId, ownerId }: Input): Promise<Output> {
    const campaign = await this.campaigns.findById(campaignId);
    if (!campaign)                    return left(new Error("Campanha não encontrada"));
    if (campaign.ownerId !== ownerId) return left(new Error("Não autorizado"));

    const all = await this.sends.findManyByCampaign(campaignId);
    const byStatus: Record<SendStatus, number> = {
      PENDING: 0, RUNNING: 0, DONE: 0, FAILED: 0, OPTED_OUT: 0,
    };
    for (const s of all) byStatus[s.status]++;
    return right({ stats: { total: all.length, byStatus } });
  }
}
