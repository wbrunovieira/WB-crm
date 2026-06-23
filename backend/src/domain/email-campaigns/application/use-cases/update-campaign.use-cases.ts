import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { EmailCampaign } from "../../enterprise/entities/email-campaign.entity";
import { EmailCampaignStep } from "../../enterprise/entities/email-campaign-step.entity";
import { EmailCampaignsRepository } from "../repositories/email-campaigns.repository";
import { EmailCampaignStepsRepository } from "../repositories/email-campaign-steps.repository";

export class CampaignNotFoundError extends Error {
  constructor() { super("Campanha não encontrada"); this.name = "CampaignNotFoundError"; }
}
export class CampaignStepNotFoundError extends Error {
  constructor() { super("Passo da campanha não encontrado"); this.name = "CampaignStepNotFoundError"; }
}
export class CampaignAccessDeniedError extends Error {
  constructor() { super("Acesso negado"); this.name = "CampaignAccessDeniedError"; }
}

/** Edit a campaign's metadata (name / description / fromEmail). Owner-only. */
@Injectable()
export class UpdateEmailCampaignUseCase {
  constructor(private readonly campaigns: EmailCampaignsRepository) {}

  async execute(input: {
    campaignId: string;
    ownerId: string;
    name?: string;
    description?: string;
    fromEmail?: string;
  }): Promise<Either<Error, EmailCampaign>> {
    const campaign = await this.campaigns.findById(input.campaignId);
    if (!campaign) return left(new CampaignNotFoundError());
    if (campaign.ownerId !== input.ownerId) return left(new CampaignAccessDeniedError());

    campaign.update({ name: input.name, description: input.description, fromEmail: input.fromEmail });
    await this.campaigns.save(campaign);
    return right(campaign);
  }
}

/** Edit a single step's content (subject / bodyHtml / delayDays). Owner-only. */
@Injectable()
export class UpdateCampaignStepUseCase {
  constructor(
    private readonly steps: EmailCampaignStepsRepository,
    private readonly campaigns: EmailCampaignsRepository,
  ) {}

  async execute(input: {
    stepId: string;
    ownerId: string;
    subject?: string;
    bodyHtml?: string;
    delayDays?: number;
  }): Promise<Either<Error, EmailCampaignStep>> {
    const step = await this.steps.findById(input.stepId);
    if (!step) return left(new CampaignStepNotFoundError());

    const campaign = await this.campaigns.findById(step.campaignId);
    if (!campaign || campaign.ownerId !== input.ownerId) {
      return left(new CampaignAccessDeniedError());
    }

    step.update({ subject: input.subject, bodyHtml: input.bodyHtml, delayDays: input.delayDays });
    await this.steps.save(step);
    return right(step);
  }
}

/** Read a campaign's steps (used to pre-fill the edit form). */
@Injectable()
export class GetCampaignStepsUseCase {
  constructor(private readonly steps: EmailCampaignStepsRepository) {}

  async execute(campaignId: string): Promise<EmailCampaignStep[]> {
    return this.steps.findByCampaign(campaignId);
  }
}
