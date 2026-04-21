import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { PipelinesRepository } from "../repositories/pipelines.repository";
import type { PipelineView } from "../../enterprise/read-models/pipeline-read-models";

export class PipelineNotFoundError extends Error {
  constructor() { super("Pipeline não encontrado"); this.name = "PipelineNotFoundError"; }
}

@Injectable()
export class GetPipelineViewUseCase {
  constructor(private readonly repo: PipelinesRepository) {}

  async execute(
    requesterId: string,
    requesterRole: string,
    pipelineId?: string,
  ): Promise<Either<PipelineNotFoundError, { view: PipelineView }>> {
    const view = await this.repo.findView(requesterId, requesterRole, pipelineId);
    if (!view) return left(new PipelineNotFoundError());
    return right({ view });
  }
}
