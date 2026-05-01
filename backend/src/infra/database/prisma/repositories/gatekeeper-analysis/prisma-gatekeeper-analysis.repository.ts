import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { GatekeeperAnalysisRepository } from "@/domain/integrations/gatekeeper-analysis/application/repositories/gatekeeper-analysis.repository";
import { GatekeeperAnalysis } from "@/domain/integrations/gatekeeper-analysis/enterprise/entities/gatekeeper-analysis.entity";
import { GatekeeperAnalysisMapper } from "@/infra/database/prisma/mappers/gatekeeper-analysis/gatekeeper-analysis.mapper";

@Injectable()
export class PrismaGatekeeperAnalysisRepository extends GatekeeperAnalysisRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async save(analysis: GatekeeperAnalysis): Promise<void> {
    const data = GatekeeperAnalysisMapper.toPrisma(analysis);
    await this.prisma.gatekeeperAnalysis.upsert({
      where: { id: data.id },
      create: data,
      update: {
        score: data.score,
        summary: data.summary,
        status: data.status,
        errorMsg: data.errorMsg,
        jobId: data.jobId,
        raportRecepcao: data.raportRecepcao,
        raportAlianca: data.raportAlianca,
        raportPerguntas: data.raportPerguntas,
        raportObjecoes: data.raportObjecoes,
        raportResultado: data.raportResultado,
        raportTecnicas: data.raportTecnicas,
        positivePoints: data.positivePoints,
        improvementPoints: data.improvementPoints,
      },
    });
  }

  async findById(id: string): Promise<GatekeeperAnalysis | null> {
    const raw = await this.prisma.gatekeeperAnalysis.findUnique({ where: { id } });
    return raw ? GatekeeperAnalysisMapper.toDomain(raw) : null;
  }

  async findByActivityId(activityId: string): Promise<GatekeeperAnalysis | null> {
    const raw = await this.prisma.gatekeeperAnalysis.findUnique({ where: { activityId } });
    return raw ? GatekeeperAnalysisMapper.toDomain(raw) : null;
  }

  async findByJobId(jobId: string): Promise<GatekeeperAnalysis | null> {
    const raw = await this.prisma.gatekeeperAnalysis.findUnique({ where: { jobId } });
    return raw ? GatekeeperAnalysisMapper.toDomain(raw) : null;
  }

  async findByIds(ids: string[]): Promise<GatekeeperAnalysis[]> {
    const rows = await this.prisma.gatekeeperAnalysis.findMany({
      where: { id: { in: ids } },
    });
    return rows.map(GatekeeperAnalysisMapper.toDomain);
  }

  async findByOwner(ownerId: string): Promise<GatekeeperAnalysis[]> {
    const rows = await this.prisma.gatekeeperAnalysis.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(GatekeeperAnalysisMapper.toDomain);
  }

  async findAll(): Promise<GatekeeperAnalysis[]> {
    const rows = await this.prisma.gatekeeperAnalysis.findMany({
      orderBy: { createdAt: "desc" },
    });
    return rows.map(GatekeeperAnalysisMapper.toDomain);
  }
}
