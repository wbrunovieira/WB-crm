import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { PipelinesRepository } from "../repositories/pipelines.repository";
import { Stage } from "../../enterprise/entities/stage";

export interface CreateStageInput {
  name: string;
  order: number;
  probability: number;
  pipelineId: string;
}

type Output = Either<Error, { stage: Stage }>;

@Injectable()
export class CreateStageUseCase {
  constructor(private readonly repo: PipelinesRepository) {}

  async execute(input: CreateStageInput): Promise<Output> {
    const name = (input.name ?? "").trim();
    if (!name) return left(new Error("Nome do estágio é obrigatório"));

    const pipeline = await this.repo.findByIdRaw(input.pipelineId);
    if (!pipeline) return left(new Error("Pipeline não encontrado"));

    const stage = Stage.create({
      name,
      order: input.order,
      probability: input.probability,
      pipelineId: input.pipelineId,
    });

    await this.repo.saveStage(stage);
    return right({ stage });
  }
}
