import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { EmailCampaignStep } from "../../enterprise/entities/email-campaign-step.entity";
import { EmailCampaignsRepository } from "../repositories/email-campaigns.repository";
import { EmailCampaignStepsRepository } from "../repositories/email-campaign-steps.repository";

interface Input { campaignId: string; order: number; subject: string; bodyHtml: string; delayDays: number; }
interface Output { id: string; }

@Injectable()
export class AddCampaignStepUseCase {
  constructor(
    private readonly campaigns: EmailCampaignsRepository,
    private readonly steps: EmailCampaignStepsRepository,
  ) {}

  async execute(input: Input): Promise<Either<Error, Output>> {
    const campaign = await this.campaigns.findById(input.campaignId);
    if (!campaign) return left(new Error("Campaign not found"));

    const step = EmailCampaignStep.create(input);
    await this.steps.save(step);
    return right({ id: step.id.toString() });
  }
}
