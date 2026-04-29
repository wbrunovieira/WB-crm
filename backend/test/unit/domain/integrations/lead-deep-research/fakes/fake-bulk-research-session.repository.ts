import { BulkResearchSessionRepository, BulkResearchSessionData } from "@/domain/integrations/lead-deep-research/application/repositories/bulk-research-session.repository";

export class FakeBulkResearchSessionRepository extends BulkResearchSessionRepository {
  async create(): Promise<BulkResearchSessionData> { return null as unknown as BulkResearchSessionData; }
  async findActiveByUserId(): Promise<null> { return null; }
  async findActiveContainingLead(): Promise<null> { return null; }
  async markLeadCompleted(): Promise<BulkResearchSessionData> { return null as unknown as BulkResearchSessionData; }
  async markCompleted(): Promise<void> {}
  async cancel(): Promise<void> {}
  async cancelAllActiveForUser(): Promise<void> {}
}
