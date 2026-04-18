import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { PipelinesRepository } from "../repositories/pipelines.repository";
import type { Stage } from "../../enterprise/entities/stage";

export interface UpdateStageInput {
  id: string;
  name?: string;
  order?: number;
  probability?: number;
}

type Output = Either<Error, { stage: Stage }>;

@Injectable()
export class UpdateStageUseCase {
  constructor(private readonly repo: PipelinesRepository) {}

  async execute(input: UpdateStageInput): Promise<Output> {
    const stage = await this.repo.findStageById(input.id);
    if (!stage) return left(new Error("Estágio não encontrado"));

    stage.update({
      name: input.name?.trim() ?? stage.name,
      order: input.order ?? stage.order,
      probability: input.probability ?? stage.probability,
    });

    await this.repo.saveStage(stage);
    return right({ stage });
  }
}
