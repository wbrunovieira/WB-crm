import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { GatekeeperBatchRepository } from "@/domain/integrations/gatekeeper-analysis/application/repositories/gatekeeper-batch.repository";
import { GatekeeperBatch } from "@/domain/integrations/gatekeeper-analysis/enterprise/entities/gatekeeper-batch.entity";
import { GatekeeperBatchMapper } from "@/infra/database/prisma/mappers/gatekeeper-analysis/gatekeeper-batch.mapper";

@Injectable()
export class PrismaGatekeeperBatchRepository extends GatekeeperBatchRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async save(batch: GatekeeperBatch): Promise<void> {
    const data = GatekeeperBatchMapper.toPrisma(batch);
    await this.prisma.gatekeeperBatch.upsert({
      where: { id: data.id },
      create: data,
      update: {
        status: data.status,
        jobId: data.jobId,
        errorMsg: data.errorMsg,
        analysisIds: data.analysisIds,
        overallScore: data.overallScore,
        dimensionAverages: data.dimensionAverages,
        patterns: data.patterns,
        comparisonWithHistory: data.comparisonWithHistory,
        individualHighlights: data.individualHighlights,
        recommendations: data.recommendations,
        newSummary: data.newSummary,
        positivePoints: data.positivePoints,
        improvementPoints: data.improvementPoints,
      },
    });
  }

  async findById(id: string): Promise<GatekeeperBatch | null> {
    const raw = await this.prisma.gatekeeperBatch.findUnique({ where: { id } });
    return raw ? GatekeeperBatchMapper.toDomain(raw) : null;
  }

  async findByJobId(jobId: string): Promise<GatekeeperBatch | null> {
    const raw = await this.prisma.gatekeeperBatch.findUnique({ where: { jobId } });
    return raw ? GatekeeperBatchMapper.toDomain(raw) : null;
  }

  async findByOwner(ownerId: string): Promise<GatekeeperBatch[]> {
    const rows = await this.prisma.gatekeeperBatch.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(GatekeeperBatchMapper.toDomain);
  }

  async findCompletedSummaries(ownerId: string): Promise<GatekeeperBatch[]> {
    const rows = await this.prisma.gatekeeperBatch.findMany({
      where: { ownerId, status: "completed", newSummary: { not: null } },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(GatekeeperBatchMapper.toDomain);
  }
}
