import type { Pipeline } from "../../enterprise/entities/pipeline";
import type { Stage } from "../../enterprise/entities/stage";
import type { PipelineSummary, PipelineDetail } from "../../enterprise/read-models/pipeline-read-models";

export abstract class PipelinesRepository {
  abstract findMany(): Promise<PipelineSummary[]>;
  abstract findById(id: string): Promise<PipelineDetail | null>;
  abstract findByIdRaw(id: string): Promise<Pipeline | null>;
  abstract save(pipeline: Pipeline): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract clearDefault(): Promise<void>;

  // Stage operations (co-located since stages belong to pipelines)
  abstract findStagesByPipeline(pipelineId: string): Promise<import("../../enterprise/read-models/pipeline-read-models").StageSummary[]>;
  abstract findStageById(id: string): Promise<Stage | null>;
  abstract saveStage(stage: Stage): Promise<void>;
  abstract deleteStage(id: string): Promise<void>;
  abstract reorderStages(pipelineId: string, stageIds: string[]): Promise<void>;
  abstract countDealsInStage(stageId: string): Promise<number>;
  abstract createDefaultStages(pipelineId: string): Promise<void>;
}
