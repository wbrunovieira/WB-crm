import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { PipelinesRepository } from "../repositories/pipelines.repository";
import type { Pipeline } from "../../enterprise/entities/pipeline";

type Output = Either<Error, { pipeline: Pipeline }>;

@Injectable()
export class SetDefaultPipelineUseCase {
  constructor(private readonly repo: PipelinesRepository) {}

  async execute(id: string): Promise<Output> {
    const pipeline = await this.repo.findByIdRaw(id);
    if (!pipeline) return left(new Error("Pipeline não encontrado"));

    await this.repo.clearDefault();
    pipeline.setDefault(true);
    await this.repo.save(pipeline);

    return right({ pipeline });
  }
}
