import type { CampaignSend } from "../../enterprise/entities/campaign-send";

export abstract class CampaignSendsRepository {
  abstract findById(id: string): Promise<CampaignSend | null>;
  abstract findManyByCampaign(campaignId: string): Promise<CampaignSend[]>;
  /** Busca sends prontos para executar: PENDING ou RUNNING com scheduledAt <= now */
  abstract findDueForExecution(limit: number): Promise<CampaignSend[]>;
  abstract save(send: CampaignSend): Promise<void>;
  abstract saveMany(sends: CampaignSend[]): Promise<void>;
  abstract countByCampaign(campaignId: string): Promise<number>;
}
