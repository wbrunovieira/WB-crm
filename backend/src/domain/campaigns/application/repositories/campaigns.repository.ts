import type { Campaign } from "../../enterprise/entities/campaign";

export abstract class CampaignsRepository {
  abstract findById(id: string): Promise<Campaign | null>;
  abstract findManyByOwner(ownerId: string): Promise<Campaign[]>;
  abstract save(campaign: Campaign): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
