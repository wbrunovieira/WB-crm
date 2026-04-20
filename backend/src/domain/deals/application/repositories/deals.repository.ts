import type { Deal } from "../../enterprise/entities/deal";
import type { DealSummary, DealDetail } from "../../enterprise/read-models/deal-read-models";

export interface DealFilters {
  search?: string;
  owner?: string;
  stageId?: string;
  status?: string;
  organizationId?: string;
  contactId?: string;
}

export interface StageData {
  id: string;
  name: string;
  probability: number;
}

export interface CreateStageHistoryInput {
  dealId: string;
  fromStageId: string | null;
  toStageId: string;
  changedById: string;
}

export abstract class DealsRepository {
  abstract findMany(requesterId: string, requesterRole: string, filters?: DealFilters): Promise<DealSummary[]>;
  abstract findById(id: string, requesterId: string, requesterRole: string): Promise<DealDetail | null>;
  abstract findByIdRaw(id: string): Promise<Deal | null>;
  abstract findStageById(id: string): Promise<StageData | null>;
  abstract save(deal: Deal): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract createStageHistory(input: CreateStageHistoryInput): Promise<void>;
  abstract updateStageHistoryDate(historyId: string, changedAt: Date): Promise<{ dealId: string } | null>;
}
