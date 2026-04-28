export interface CreateLeadAgentResearchLogData {
  leadId: string;
  jobId: string;
  updatedFields?: string[];
  proposedFields?: Array<{ field: string; foundValue: string; skippedReason: string }>;
  summary?: string;
  status: "completed" | "error";
  error?: string;
}

export interface LeadAgentResearchLogRecord {
  id: string;
  leadId: string;
  jobId: string;
  updatedFields: string | null;
  proposedFields: string | null;
  summary: string | null;
  status: string;
  error: string | null;
  createdAt: Date;
}

export abstract class LeadAgentResearchLogRepository {
  abstract create(data: CreateLeadAgentResearchLogData): Promise<LeadAgentResearchLogRecord>;
  abstract findByLead(leadId: string): Promise<LeadAgentResearchLogRecord[]>;
}
