import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { PipelinesRepository } from "../repositories/pipelines.repository";
import { Pipeline } from "../../enterprise/entities/pipeline";
import { PipelineName } from "../../enterprise/value-objects/pipeline-name.vo";

export interface CreatePipelineInput {
  name: string;
  isDefault?: boolean;
}

type Output = Either<Error, { pipeline: Pipeline }>;

@Injectable()
export class CreatePipelineUseCase {
  constructor(private readonly repo: PipelinesRepository) {}

  async execute(input: CreatePipelineInput): Promise<Output> {
    const nameResult = PipelineName.create(input.name);
    if (nameResult.isLeft()) return left(nameResult.value);
    const name = nameResult.value.value;

    if (input.isDefault) {
      await this.repo.clearDefault();
    }

    const pipeline = Pipeline.create({ name, isDefault: input.isDefault ?? false });
    await this.repo.save(pipeline);
    await this.repo.createDefaultStages(pipeline.id.toString());

    return right({ pipeline });
  }
}
