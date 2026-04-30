import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { MeetAnalysisRepository } from "@/domain/integrations/meet-analysis/application/repositories/meet-analysis.repository";
import { MeetAnalysis } from "@/domain/integrations/meet-analysis/enterprise/entities/meet-analysis.entity";
import { MeetAnalysisMapper } from "@/infra/database/prisma/mappers/meet-analysis/meet-analysis.mapper";

@Injectable()
export class PrismaMeetAnalysisRepository extends MeetAnalysisRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async save(analysis: MeetAnalysis): Promise<void> {
    const data = MeetAnalysisMapper.toPrisma(analysis);
    await this.prisma.meetAnalysis.upsert({
      where: { id: data.id },
      create: data,
      update: {
        score: data.score,
        summary: data.summary,
        nextStep: data.nextStep,
        status: data.status,
        errorMsg: data.errorMsg,
        jobId: data.jobId,
        diagBusiness: data.diagBusiness,
        diagGaps: data.diagGaps,
        diagUrgency: data.diagUrgency,
        diagDecisionPower: data.diagDecisionPower,
        diagEngagement: data.diagEngagement,
        diagClosing: data.diagClosing,
        positivePoints: data.positivePoints,
        improvementPoints: data.improvementPoints,
      },
    });
  }

  async findById(id: string): Promise<MeetAnalysis | null> {
    const raw = await this.prisma.meetAnalysis.findUnique({ where: { id } });
    if (!raw) return null;
    return MeetAnalysisMapper.toDomain(raw);
  }

  async findByActivityId(activityId: string): Promise<MeetAnalysis | null> {
    const raw = await this.prisma.meetAnalysis.findUnique({ where: { activityId } });
    if (!raw) return null;
    return MeetAnalysisMapper.toDomain(raw);
  }

  async findByJobId(jobId: string): Promise<MeetAnalysis | null> {
    const raw = await this.prisma.meetAnalysis.findUnique({ where: { jobId } });
    if (!raw) return null;
    return MeetAnalysisMapper.toDomain(raw);
  }

  async findByOwner(ownerId: string): Promise<MeetAnalysis[]> {
    const rows = await this.prisma.meetAnalysis.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(MeetAnalysisMapper.toDomain);
  }

  async findAll(): Promise<MeetAnalysis[]> {
    const rows = await this.prisma.meetAnalysis.findMany({
      orderBy: { createdAt: "desc" },
    });
    return rows.map(MeetAnalysisMapper.toDomain);
  }
}
