import { Injectable } from "@nestjs/common";
import { right, type Either } from "@/core/either";
import { CampaignsRepository } from "../repositories/campaigns.repository";
import type { Campaign } from "../../enterprise/entities/campaign";

interface Input { ownerId: string }
type Output = Either<never, { campaigns: Campaign[] }>;

@Injectable()
export class ListCampaignsUseCase {
  constructor(private readonly campaigns: CampaignsRepository) {}

  async execute({ ownerId }: Input): Promise<Output> {
    const campaigns = await this.campaigns.findManyByOwner(ownerId);
    return right({ campaigns });
  }
}
