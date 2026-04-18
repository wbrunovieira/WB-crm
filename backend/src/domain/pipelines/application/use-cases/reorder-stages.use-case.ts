import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { PipelinesRepository } from "../repositories/pipelines.repository";

export interface ReorderStagesInput {
  pipelineId: string;
  stageIds: string[];
}

type Output = Either<Error, void>;

@Injectable()
export class ReorderStagesUseCase {
  constructor(private readonly repo: PipelinesRepository) {}

  async execute(input: ReorderStagesInput): Promise<Output> {
    const pipeline = await this.repo.findByIdRaw(input.pipelineId);
    if (!pipeline) return left(new Error("Pipeline não encontrado"));

    await this.repo.reorderStages(input.pipelineId, input.stageIds);
    return right(undefined);
  }
}
