import type { Deal } from "../../enterprise/entities/deal";
import type { DealSummary, DealDetail } from "../../enterprise/read-models/deal-read-models";

export interface DealFilters {
  search?: string;
  owner?: string;
  stageId?: string;
  status?: string;
  organizationId?: string;
  contactId?: string;
  leadId?: string;
  partnerId?: string;
  referredByPartnerId?: string;
  valueRange?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  closedMonth?: string;
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

/** Rastro de alteração de valor/status de um negócio já existente.
 *  Espelha CreateStageHistoryInput — mesmo padrão, outro eixo. */
export interface CreateValueHistoryInput {
  dealId: string;
  fromValue: number | null;
  toValue: number | null;
  fromCurrency: string | null;
  toCurrency: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  changedById: string;
}

export interface DealTechStackRecord {
  categories: { id: string; categoryId: string; categoryName: string }[];
  languages: { id: string; languageId: string; languageName: string; isPrimary: boolean }[];
  frameworks: { id: string; frameworkId: string; frameworkName: string }[];
}

export abstract class DealsRepository {
  abstract findMany(requesterId: string, requesterRole: string, filters?: DealFilters): Promise<DealSummary[]>;
  abstract findById(id: string, requesterId: string, requesterRole: string): Promise<DealDetail | null>;
  abstract findByIdRaw(id: string): Promise<Deal | null>;
  abstract findStageById(id: string): Promise<StageData | null>;
  abstract save(deal: Deal): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract createStageHistory(input: CreateStageHistoryInput): Promise<void>;
  abstract createValueHistory(input: CreateValueHistoryInput): Promise<void>;
  /** Nome da organização, para o payload do financeiro. Consulta leve: carregar o DealDetail
   *  inteiro só para obter um nome seria desperdício no caminho de escrita. */
  abstract findOrganizationName(organizationId: string): Promise<string | null>;
  abstract updateStageHistoryDate(historyId: string, changedAt: Date): Promise<{ dealId: string } | null>;

  // Tech stack
  abstract getTechStack(dealId: string): Promise<DealTechStackRecord>;
  abstract addCategory(dealId: string, categoryId: string): Promise<void>;
  abstract removeCategory(dealId: string, categoryId: string): Promise<void>;
  abstract addLanguage(dealId: string, languageId: string, isPrimary?: boolean): Promise<void>;
  abstract removeLanguage(dealId: string, languageId: string): Promise<void>;
  abstract setPrimaryLanguage(dealId: string, languageId: string): Promise<void>;
  abstract addFramework(dealId: string, frameworkId: string): Promise<void>;
  abstract removeFramework(dealId: string, frameworkId: string): Promise<void>;
}
