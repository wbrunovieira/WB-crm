import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { EmailCampaignsRepository } from "../repositories/email-campaigns.repository";
import type { EmailCampaign } from "../../enterprise/entities/email-campaign.entity";

export class CampaignNotFoundError extends Error {
  name = "CampaignNotFoundError";
  constructor() { super("Campaign not found"); }
}

@Injectable()
export class ListEmailCampaignsUseCase {
  constructor(private readonly repo: EmailCampaignsRepository) {}
  async execute(ownerId: string): Promise<EmailCampaign[]> {
    return this.repo.findAllByOwner(ownerId);
  }
}

@Injectable()
export class DeleteEmailCampaignUseCase {
  constructor(private readonly repo: EmailCampaignsRepository) {}
  async execute(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}

@Injectable()
export class StartEmailCampaignUseCase {
  constructor(private readonly repo: EmailCampaignsRepository) {}
  async execute(id: string): Promise<Either<CampaignNotFoundError, { status: string }>> {
    const campaign = await this.repo.findById(id);
    if (!campaign) return left(new CampaignNotFoundError());
    campaign.start();
    await this.repo.save(campaign);
    return right({ status: campaign.status });
  }
}

@Injectable()
export class PauseEmailCampaignUseCase {
  constructor(private readonly repo: EmailCampaignsRepository) {}
  async execute(id: string): Promise<Either<CampaignNotFoundError, { status: string }>> {
    const campaign = await this.repo.findById(id);
    if (!campaign) return left(new CampaignNotFoundError());
    campaign.pause();
    await this.repo.save(campaign);
    return right({ status: campaign.status });
  }
}

/**
 * Ativa a campanha se estiver em DRAFT/PAUSED (usado pelo send-now para não
 * exigir start manual). Retorna left se a campanha não existe.
 */
@Injectable()
export class ActivateCampaignForSendNowUseCase {
  constructor(private readonly repo: EmailCampaignsRepository) {}
  async execute(id: string): Promise<Either<CampaignNotFoundError, void>> {
    const campaign = await this.repo.findById(id);
    if (!campaign) return left(new CampaignNotFoundError());
    if (campaign.status === "DRAFT" || campaign.status === "PAUSED") {
      campaign.start();
      await this.repo.save(campaign);
    }
    return right(undefined);
  }
}
