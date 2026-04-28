import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { LeadAgentResearchLogRepository, type CreateLeadAgentResearchLogData, type LeadAgentResearchLogRecord } from "../application/repositories/lead-agent-research-log.repository";

@Injectable()
export class PrismaLeadAgentResearchLogRepository extends LeadAgentResearchLogRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(data: CreateLeadAgentResearchLogData): Promise<LeadAgentResearchLogRecord> {
    return this.prisma.leadAgentResearchLog.create({
      data: {
        leadId: data.leadId,
        jobId: data.jobId,
        updatedFields: data.updatedFields ? JSON.stringify(data.updatedFields) : null,
        proposedFields: data.proposedFields ? JSON.stringify(data.proposedFields) : null,
        summary: data.summary ?? null,
        status: data.status,
        error: data.error ?? null,
      },
    });
  }

  async findByLead(leadId: string): Promise<LeadAgentResearchLogRecord[]> {
    return this.prisma.leadAgentResearchLog.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
    });
  }
}
