import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { CallAnalysisRepository } from "@/domain/integrations/call-analysis/application/repositories/call-analysis.repository";
import { CallAnalysis } from "@/domain/integrations/call-analysis/enterprise/entities/call-analysis.entity";
import { CallAnalysisMapper } from "@/infra/database/prisma/mappers/call-analysis/call-analysis.mapper";

@Injectable()
export class PrismaCallAnalysisRepository extends CallAnalysisRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async save(analysis: CallAnalysis): Promise<void> {
    const data = CallAnalysisMapper.toPrisma(analysis);
    await this.prisma.callAnalysis.upsert({
      where: { id: data.id },
      create: data,
      update: {
        score: data.score,
        noShowRisk: data.noShowRisk,
        noShowRiskText: data.noShowRiskText,
        summary: data.summary,
        status: data.status,
        errorMsg: data.errorMsg,
        jobId: data.jobId,
        spicedSituation: data.spicedSituation,
        spicedPain: data.spicedPain,
        spicedImpact: data.spicedImpact,
        spicedCritical: data.spicedCritical,
        spicedEvidence: data.spicedEvidence,
        microPactos: data.microPactos,
        schedulingTechniques: data.schedulingTechniques,
        microAnalysis: data.microAnalysis,
        positivePoints: data.positivePoints,
        improvementPoints: data.improvementPoints,
      },
    });
  }

  async findById(id: string): Promise<CallAnalysis | null> {
    const raw = await this.prisma.callAnalysis.findUnique({ where: { id } });
    if (!raw) return null;
    return CallAnalysisMapper.toDomain(raw);
  }

  async findByActivityId(activityId: string): Promise<CallAnalysis | null> {
    const raw = await this.prisma.callAnalysis.findUnique({
      where: { activityId },
    });
    if (!raw) return null;
    return CallAnalysisMapper.toDomain(raw);
  }

  async findByJobId(jobId: string): Promise<CallAnalysis | null> {
    const raw = await this.prisma.callAnalysis.findUnique({
      where: { jobId },
    });
    if (!raw) return null;
    return CallAnalysisMapper.toDomain(raw);
  }

  async findByOwner(ownerId: string): Promise<CallAnalysis[]> {
    const rows = await this.prisma.callAnalysis.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(CallAnalysisMapper.toDomain);
  }

  async findAll(): Promise<CallAnalysis[]> {
    const rows = await this.prisma.callAnalysis.findMany({
      orderBy: { createdAt: "desc" },
    });
    return rows.map(CallAnalysisMapper.toDomain);
  }
}
