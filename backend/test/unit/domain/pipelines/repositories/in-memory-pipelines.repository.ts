import { PipelinesRepository } from "@/domain/pipelines/application/repositories/pipelines.repository";
import type { Pipeline } from "@/domain/pipelines/enterprise/entities/pipeline";
import type { Stage } from "@/domain/pipelines/enterprise/entities/stage";
import { Stage as StageEntity } from "@/domain/pipelines/enterprise/entities/stage";
import type { PipelineSummary, PipelineDetail, StageSummary } from "@/domain/pipelines/enterprise/read-models/pipeline-read-models";

const DEFAULT_STAGES = [
  { name: "Qualificação", order: 1, probability: 10 },
  { name: "Proposta",     order: 2, probability: 30 },
  { name: "Negociação",   order: 3, probability: 60 },
  { name: "Fechamento",   order: 4, probability: 90 },
];

function toStageSummary(s: Stage, dealCount = 0): StageSummary {
  return {
    id: s.id.toString(),
    name: s.name,
    order: s.order,
    probability: s.probability,
    pipelineId: s.pipelineId,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    _count: { deals: dealCount },
  };
}

export class InMemoryPipelinesRepository extends PipelinesRepository {
  public pipelines: Pipeline[] = [];
  public stages: Stage[] = [];
  public dealCounts: Map<string, number> = new Map(); // stageId → deal count

  async findMany(): Promise<PipelineSummary[]> {
    return this.pipelines.map((p) => ({
      id: p.id.toString(),
      name: p.name,
      isDefault: p.isDefault,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      stages: this.stages
        .filter((s) => s.pipelineId === p.id.toString())
        .sort((a, b) => a.order - b.order)
        .map((s) => toStageSummary(s, this.dealCounts.get(s.id.toString()) ?? 0)),
    }));
  }

  async findById(id: string): Promise<PipelineDetail | null> {
    const p = this.pipelines.find((p) => p.id.toString() === id);
    if (!p) return null;
    return {
      id: p.id.toString(),
      name: p.name,
      isDefault: p.isDefault,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      stages: this.stages
        .filter((s) => s.pipelineId === p.id.toString())
        .sort((a, b) => a.order - b.order)
        .map((s) => toStageSummary(s, this.dealCounts.get(s.id.toString()) ?? 0)),
    };
  }

  async findByIdRaw(id: string): Promise<Pipeline | null> {
    return this.pipelines.find((p) => p.id.toString() === id) ?? null;
  }

  async save(pipeline: Pipeline): Promise<void> {
    const idx = this.pipelines.findIndex((p) => p.id.equals(pipeline.id));
    if (idx >= 0) this.pipelines[idx] = pipeline;
    else this.pipelines.push(pipeline);
  }

  async delete(id: string): Promise<void> {
    this.pipelines = this.pipelines.filter((p) => p.id.toString() !== id);
    this.stages = this.stages.filter((s) => s.pipelineId !== id);
  }

  async clearDefault(): Promise<void> {
    this.pipelines.forEach((p) => p.setDefault(false));
  }

  async findStagesByPipeline(pipelineId: string): Promise<StageSummary[]> {
    return this.stages
      .filter((s) => s.pipelineId === pipelineId)
      .sort((a, b) => a.order - b.order)
      .map((s) => toStageSummary(s, this.dealCounts.get(s.id.toString()) ?? 0));
  }

  async findStageById(id: string): Promise<Stage | null> {
    return this.stages.find((s) => s.id.toString() === id) ?? null;
  }

  async saveStage(stage: Stage): Promise<void> {
    const idx = this.stages.findIndex((s) => s.id.equals(stage.id));
    if (idx >= 0) this.stages[idx] = stage;
    else this.stages.push(stage);
  }

  async deleteStage(id: string): Promise<void> {
    this.stages = this.stages.filter((s) => s.id.toString() !== id);
  }

  async reorderStages(pipelineId: string, stageIds: string[]): Promise<void> {
    stageIds.forEach((stageId, index) => {
      const s = this.stages.find((s) => s.id.toString() === stageId && s.pipelineId === pipelineId);
      if (s) s.update({ order: index + 1 });
    });
  }

  async countDealsInStage(stageId: string): Promise<number> {
    return this.dealCounts.get(stageId) ?? 0;
  }

  async createDefaultStages(pipelineId: string): Promise<void> {
    for (const d of DEFAULT_STAGES) {
      const stage = StageEntity.create({ ...d, pipelineId });
      this.stages.push(stage);
    }
  }
}
