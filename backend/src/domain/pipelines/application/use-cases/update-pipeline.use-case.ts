import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { PipelinesRepository } from "../repositories/pipelines.repository";
import type { Pipeline } from "../../enterprise/entities/pipeline";

export interface UpdatePipelineInput {
  id: string;
  name?: string;
  isDefault?: boolean;
}

type Output = Either<Error, { pipeline: Pipeline }>;

@Injectable()
export class UpdatePipelineUseCase {
  constructor(private readonly repo: PipelinesRepository) {}

  async execute(input: UpdatePipelineInput): Promise<Output> {
    const pipeline = await this.repo.findByIdRaw(input.id);
    if (!pipeline) return left(new Error("Pipeline não encontrado"));

    if (input.isDefault === true && !pipeline.isDefault) {
      await this.repo.clearDefault();
    }

    pipeline.update({
      name: input.name?.trim() ?? pipeline.name,
      isDefault: input.isDefault ?? pipeline.isDefault,
    });

    await this.repo.save(pipeline);
    return right({ pipeline });
  }
}
