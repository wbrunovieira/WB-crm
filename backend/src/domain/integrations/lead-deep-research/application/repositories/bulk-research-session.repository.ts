export interface BulkResearchSessionData {
  id: string;
  userId: string;
  leadIds: string[];
  completedIds: string[];
  total: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export abstract class BulkResearchSessionRepository {
  abstract create(data: { userId: string; leadIds: string[]; total: number }): Promise<BulkResearchSessionData>;
  abstract findActiveByUserId(userId: string): Promise<BulkResearchSessionData | null>;
  abstract findActiveContainingLead(leadId: string): Promise<BulkResearchSessionData | null>;
  abstract markLeadCompleted(sessionId: string, leadId: string): Promise<BulkResearchSessionData>;
  abstract markCompleted(sessionId: string): Promise<void>;
  abstract cancel(sessionId: string): Promise<void>;
  abstract cancelAllActiveForUser(userId: string): Promise<void>;
}
