import {
  DealsRepository,
  type DealFilters,
  type StageData,
  type CreateStageHistoryInput,
  type DealTechStackRecord,
} from "@/domain/deals/application/repositories/deals.repository";
import type { Deal } from "@/domain/deals/enterprise/entities/deal";
import type { DealSummary, DealDetail } from "@/domain/deals/enterprise/read-models/deal-read-models";

export class InMemoryDealsRepository extends DealsRepository {
  public items: Deal[] = [];
  public stages: StageData[] = [];
  public stageHistories: CreateStageHistoryInput[] = [];

  async findMany(requesterId: string, requesterRole: string, filters: DealFilters = {}): Promise<DealSummary[]> {
    let results = this.items;

    if (requesterRole !== "admin") {
      results = results.filter((d) => d.ownerId === requesterId);
    }

    if (filters.stageId) results = results.filter((d) => d.stageId === filters.stageId);
    if (filters.status) results = results.filter((d) => d.status === filters.status);
    if (filters.organizationId) results = results.filter((d) => d.organizationId === filters.organizationId);
    if (filters.contactId) results = results.filter((d) => d.contactId === filters.contactId);

    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          (d.description ?? "").toLowerCase().includes(q),
      );
    }

    return results.map((d) => ({
      id: d.id.toString(),
      ownerId: d.ownerId,
      title: d.title,
      description: d.description ?? null,
      value: d.value,
      currency: d.currency,
      status: d.status,
      closedAt: d.closedAt ?? null,
      stageId: d.stageId,
      contactId: d.contactId ?? null,
      organizationId: d.organizationId ?? null,
      leadId: d.leadId ?? null,
      expectedCloseDate: d.expectedCloseDate ?? null,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      owner: null,
      stage: this.stages.find((s) => s.id === d.stageId) ?? null,
      contact: null,
      organization: null,
      lead: null,
      _count: { activities: 0, dealProducts: 0 },
    }));
  }

  async findById(id: string, requesterId: string, requesterRole: string): Promise<DealDetail | null> {
    const deal = this.items.find((d) => d.id.toString() === id);
    if (!deal) return null;
    if (requesterRole !== "admin" && deal.ownerId !== requesterId) return null;

    return {
      id: deal.id.toString(),
      ownerId: deal.ownerId,
      title: deal.title,
      description: deal.description ?? null,
      value: deal.value,
      currency: deal.currency,
      status: deal.status,
      closedAt: deal.closedAt ?? null,
      stageId: deal.stageId,
      contactId: deal.contactId ?? null,
      organizationId: deal.organizationId ?? null,
      leadId: deal.leadId ?? null,
      expectedCloseDate: deal.expectedCloseDate ?? null,
      createdAt: deal.createdAt,
      updatedAt: deal.updatedAt,
      owner: null,
      stage: this.stages.find((s) => s.id === deal.stageId) ?? null,
      contact: null,
      organization: null,
      lead: null,
      _count: { activities: 0, dealProducts: 0 },
      activities: [],
      dealProducts: [],
      stageHistory: [],
    };
  }

  async findByIdRaw(id: string): Promise<Deal | null> {
    return this.items.find((d) => d.id.toString() === id) ?? null;
  }

  async findStageById(id: string): Promise<StageData | null> {
    return this.stages.find((s) => s.id === id) ?? null;
  }

  async save(deal: Deal): Promise<void> {
    const idx = this.items.findIndex((d) => d.id.equals(deal.id));
    if (idx >= 0) this.items[idx] = deal;
    else this.items.push(deal);
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((d) => d.id.toString() !== id);
  }

  async createStageHistory(input: CreateStageHistoryInput): Promise<void> {
    this.stageHistories.push(input);
  }

  async updateStageHistoryDate(_historyId: string, _changedAt: Date): Promise<{ dealId: string } | null> {
    return null;
  }

  async getTechStack(_dealId: string): Promise<DealTechStackRecord> {
    return { categories: [], languages: [], frameworks: [] };
  }
  async addCategory(_dealId: string, _categoryId: string): Promise<void> {}
  async removeCategory(_dealId: string, _categoryId: string): Promise<void> {}
  async addLanguage(_dealId: string, _languageId: string, _isPrimary?: boolean): Promise<void> {}
  async removeLanguage(_dealId: string, _languageId: string): Promise<void> {}
  async setPrimaryLanguage(_dealId: string, _languageId: string): Promise<void> {}
  async addFramework(_dealId: string, _frameworkId: string): Promise<void> {}
  async removeFramework(_dealId: string, _frameworkId: string): Promise<void> {}
}
