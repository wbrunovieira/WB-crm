import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { PipelinesRepository } from "@/domain/pipelines/application/repositories/pipelines.repository";
import type { Pipeline } from "@/domain/pipelines/enterprise/entities/pipeline";
import type { Stage } from "@/domain/pipelines/enterprise/entities/stage";
import { Stage as StageEntity } from "@/domain/pipelines/enterprise/entities/stage";
import type { PipelineSummary, PipelineDetail, StageSummary } from "@/domain/pipelines/enterprise/read-models/pipeline-read-models";
import { PipelineMapper } from "../../mappers/pipelines/pipeline.mapper";
import { StageMapper } from "../../mappers/pipelines/stage.mapper";

const DEFAULT_STAGES = [
  { name: "Qualificação", order: 1, probability: 10 },
  { name: "Proposta",     order: 2, probability: 30 },
  { name: "Negociação",   order: 3, probability: 60 },
  { name: "Fechamento",   order: 4, probability: 90 },
];

@Injectable()
export class PrismaPipelinesRepository extends PipelinesRepository {
  constructor(private readonly prisma: PrismaService) { super(); }

  private serializeStage(s: {
    id: string; name: string; order: number; probability: number; pipelineId: string;
    createdAt: Date; updatedAt: Date; _count: { deals: number };
  }): StageSummary {
    return {
      id: s.id, name: s.name, order: s.order, probability: s.probability,
      pipelineId: s.pipelineId, createdAt: s.createdAt, updatedAt: s.updatedAt,
      _count: { deals: s._count.deals },
    };
  }

  async findMany(): Promise<PipelineSummary[]> {
    const rows = await this.prisma.pipeline.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      include: {
        stages: { orderBy: { order: "asc" }, include: { _count: { select: { deals: true } } } },
      },
    });
    return rows.map((p) => ({
      id: p.id, name: p.name, isDefault: p.isDefault,
      createdAt: p.createdAt, updatedAt: p.updatedAt,
      stages: p.stages.map((s) => this.serializeStage(s)),
    }));
  }

  async findById(id: string): Promise<PipelineDetail | null> {
    const p = await this.prisma.pipeline.findUnique({
      where: { id },
      include: {
        stages: { orderBy: { order: "asc" }, include: { _count: { select: { deals: true } } } },
      },
    });
    if (!p) return null;
    return {
      id: p.id, name: p.name, isDefault: p.isDefault,
      createdAt: p.createdAt, updatedAt: p.updatedAt,
      stages: p.stages.map((s) => this.serializeStage(s)),
    };
  }

  async findByIdRaw(id: string): Promise<Pipeline | null> {
    const raw = await this.prisma.pipeline.findUnique({ where: { id } });
    return raw ? PipelineMapper.toDomain(raw) : null;
  }

  async save(pipeline: Pipeline): Promise<void> {
    const data = PipelineMapper.toPrisma(pipeline);
    await this.prisma.pipeline.upsert({
      where: { id: data.id },
      create: data,
      update: { name: data.name, isDefault: data.isDefault, updatedAt: data.updatedAt },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.pipeline.delete({ where: { id } });
  }

  async clearDefault(): Promise<void> {
    await this.prisma.pipeline.updateMany({ data: { isDefault: false } });
  }

  async findStagesByPipeline(pipelineId: string): Promise<StageSummary[]> {
    const rows = await this.prisma.stage.findMany({
      where: { pipelineId },
      orderBy: { order: "asc" },
      include: { _count: { select: { deals: true } } },
    });
    return rows.map((s) => this.serializeStage(s));
  }

  async findStageById(id: string): Promise<Stage | null> {
    const raw = await this.prisma.stage.findUnique({ where: { id } });
    return raw ? StageMapper.toDomain(raw) : null;
  }

  async saveStage(stage: Stage): Promise<void> {
    const data = StageMapper.toPrisma(stage);
    await this.prisma.stage.upsert({
      where: { id: data.id },
      create: data,
      update: { name: data.name, order: data.order, probability: data.probability, updatedAt: data.updatedAt },
    });
  }

  async deleteStage(id: string): Promise<void> {
    await this.prisma.stage.delete({ where: { id } });
  }

  async reorderStages(pipelineId: string, stageIds: string[]): Promise<void> {
    await this.prisma.$transaction(
      stageIds.map((id, index) =>
        this.prisma.stage.update({ where: { id }, data: { order: index + 1 } }),
      ),
    );
  }

  async countDealsInStage(stageId: string): Promise<number> {
    return this.prisma.deal.count({ where: { stageId } });
  }

  async createDefaultStages(pipelineId: string): Promise<void> {
    await this.prisma.stage.createMany({
      data: DEFAULT_STAGES.map((s) => ({ ...s, pipelineId })),
    });
  }
}
