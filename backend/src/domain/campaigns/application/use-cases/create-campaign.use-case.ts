import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { Campaign } from "../../enterprise/entities/campaign";
import { CampaignsRepository } from "../repositories/campaigns.repository";

interface Input {
  ownerId: string;
  name: string;
  instanceName: string;
  description?: string;
  antiBlockConfig?: string;
}

type Output = Either<Error, { campaign: Campaign }>;

@Injectable()
export class CreateCampaignUseCase {
  constructor(private readonly campaigns: CampaignsRepository) {}

  async execute(input: Input): Promise<Output> {
    if (!input.name.trim()) {
      return left(new Error("O nome da campanha é obrigatório"));
    }
    if (!input.instanceName.trim()) {
      return left(new Error("O nome da instância Evolution API é obrigatório"));
    }

    const campaign = Campaign.create({
      ownerId: input.ownerId,
      name: input.name.trim(),
      instanceName: input.instanceName.trim(),
      description: input.description?.trim(),
      antiBlockConfig: input.antiBlockConfig,
    });

    await this.campaigns.save(campaign);
    return right({ campaign });
  }
}
