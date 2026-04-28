import { LeadAgentResearchLogRepository, type CreateLeadAgentResearchLogData, type LeadAgentResearchLogRecord } from "@/domain/integrations/lead-deep-research/application/repositories/lead-agent-research-log.repository";

export class FakeLeadAgentResearchLogRepository extends LeadAgentResearchLogRepository {
  public items: LeadAgentResearchLogRecord[] = [];
  private counter = 0;

  async create(data: CreateLeadAgentResearchLogData): Promise<LeadAgentResearchLogRecord> {
    const record: LeadAgentResearchLogRecord = {
      id: `log-${++this.counter}`,
      leadId: data.leadId,
      jobId: data.jobId,
      updatedFields: data.updatedFields ? JSON.stringify(data.updatedFields) : null,
      proposedFields: data.proposedFields ? JSON.stringify(data.proposedFields) : null,
      summary: data.summary ?? null,
      status: data.status,
      error: data.error ?? null,
      createdAt: new Date(),
    };
    this.items.push(record);
    return record;
  }

  async findByLead(leadId: string): Promise<LeadAgentResearchLogRecord[]> {
    return this.items.filter((i) => i.leadId === leadId);
  }
}
