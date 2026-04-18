import { Injectable } from "@nestjs/common";
import { right, type Either } from "@/core/either";
import { PipelinesRepository } from "../repositories/pipelines.repository";
import type { PipelineSummary } from "../../enterprise/read-models/pipeline-read-models";

type Output = Either<never, { pipelines: PipelineSummary[] }>;

@Injectable()
export class GetPipelinesUseCase {
  constructor(private readonly repo: PipelinesRepository) {}

  async execute(): Promise<Output> {
    const pipelines = await this.repo.findMany();
    return right({ pipelines });
  }
}
