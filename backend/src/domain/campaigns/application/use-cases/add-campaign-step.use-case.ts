import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { CampaignsRepository } from "../repositories/campaigns.repository";
import { CampaignStep, type StepType } from "../../enterprise/entities/campaign-step";
import type { CampaignStep as CampaignStepEntity } from "../../enterprise/entities/campaign-step";

interface Input {
  campaignId: string;
  ownerId: string;
  type: StepType;
  text?: string;
  mediaUrl?: string;
  mediaCaption?: string;
  mediaType?: string;
  delaySeconds?: number;
  typingSeconds?: number;
}

type Output = Either<Error, { step: CampaignStepEntity }>;

@Injectable()
export class AddCampaignStepUseCase {
  constructor(private readonly campaigns: CampaignsRepository) {}

  async execute(input: Input): Promise<Output> {
    const { campaignId, ownerId, ...stepProps } = input;
    const campaign = await this.campaigns.findById(campaignId);
    if (!campaign)                    return left(new Error("Campanha não encontrada"));
    if (campaign.ownerId !== ownerId) return left(new Error("Não autorizado"));
    if (campaign.status === "ACTIVE") return left(new Error("Pause a campanha para editar steps"));

    const order = campaign.steps.length;
    const step = CampaignStep.create({ campaignId, order, ...stepProps });
    campaign.addStep(step);
    await this.campaigns.save(campaign);
    return right({ step });
  }
}
