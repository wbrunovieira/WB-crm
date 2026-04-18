import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { PipelinesRepository } from "../repositories/pipelines.repository";
import type { PipelineDetail } from "../../enterprise/read-models/pipeline-read-models";

type Output = Either<Error, { pipeline: PipelineDetail }>;

@Injectable()
export class GetPipelineByIdUseCase {
  constructor(private readonly repo: PipelinesRepository) {}

  async execute(id: string): Promise<Output> {
    const pipeline = await this.repo.findById(id);
    if (!pipeline) return left(new Error("Pipeline não encontrado"));
    return right({ pipeline });
  }
}
