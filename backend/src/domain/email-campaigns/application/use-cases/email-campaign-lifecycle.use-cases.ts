import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { EmailCampaignsRepository } from "../repositories/email-campaigns.repository";
import type { EmailCampaign } from "../../enterprise/entities/email-campaign.entity";

export class CampaignNotFoundError extends Error {
  name = "CampaignNotFoundError";
  constructor() { super("Campaign not found"); }
}

export class NotCampaignOwnerError extends Error {
  name = "NotCampaignOwnerError";
  constructor() { super("Não autorizado"); }
}

/**
 * Validação de dono isolada, para rotas fire-and-forget (send/:stepOrder) que precisam
 * recusar o não-dono de forma síncrona antes de disparar o envio em background.
 */
@Injectable()
export class AssertEmailCampaignOwnerUseCase {
  constructor(private readonly repo: EmailCampaignsRepository) {}
  async execute(id: string, ownerId: string): Promise<Either<Error, void>> {
    const campaign = await this.repo.findById(id);
    if (!campaign) return left(new CampaignNotFoundError());
    if (campaign.ownerId !== ownerId) return left(new NotCampaignOwnerError());
    return right(undefined);
  }
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
  async execute(id: string, ownerId: string): Promise<Either<Error, void>> {
    const campaign = await this.repo.findById(id);
    if (!campaign) return left(new CampaignNotFoundError());
    if (campaign.ownerId !== ownerId) return left(new NotCampaignOwnerError());
    await this.repo.delete(id);
    return right(undefined);
  }
}

@Injectable()
export class StartEmailCampaignUseCase {
  constructor(private readonly repo: EmailCampaignsRepository) {}
  async execute(id: string, ownerId: string): Promise<Either<Error, { status: string }>> {
    const campaign = await this.repo.findById(id);
    if (!campaign) return left(new CampaignNotFoundError());
    if (campaign.ownerId !== ownerId) return left(new NotCampaignOwnerError());
    campaign.start();
    await this.repo.save(campaign);
    return right({ status: campaign.status });
  }
}

@Injectable()
export class PauseEmailCampaignUseCase {
  constructor(private readonly repo: EmailCampaignsRepository) {}
  async execute(id: string, ownerId: string): Promise<Either<Error, { status: string }>> {
    const campaign = await this.repo.findById(id);
    if (!campaign) return left(new CampaignNotFoundError());
    if (campaign.ownerId !== ownerId) return left(new NotCampaignOwnerError());
    campaign.pause();
    await this.repo.save(campaign);
    return right({ status: campaign.status });
  }
}

/**
 * Ativa a campanha se estiver em DRAFT/PAUSED (usado pelo send-now para não
 * exigir start manual). Retorna left se a campanha não existe ou não é do dono.
 */
@Injectable()
export class ActivateCampaignForSendNowUseCase {
  constructor(private readonly repo: EmailCampaignsRepository) {}
  async execute(id: string, ownerId: string): Promise<Either<Error, void>> {
    const campaign = await this.repo.findById(id);
    if (!campaign) return left(new CampaignNotFoundError());
    if (campaign.ownerId !== ownerId) return left(new NotCampaignOwnerError());
    if (campaign.status === "DRAFT" || campaign.status === "PAUSED") {
      campaign.start();
      await this.repo.save(campaign);
    }
    return right(undefined);
  }
}
