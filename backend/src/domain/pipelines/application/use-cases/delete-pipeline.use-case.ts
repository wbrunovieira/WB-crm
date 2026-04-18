import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { PipelinesRepository } from "../repositories/pipelines.repository";

type Output = Either<Error, void>;

@Injectable()
export class DeletePipelineUseCase {
  constructor(private readonly repo: PipelinesRepository) {}

  async execute(id: string): Promise<Output> {
    const pipeline = await this.repo.findByIdRaw(id);
    if (!pipeline) return left(new Error("Pipeline não encontrado"));
    if (pipeline.isDefault) return left(new Error("Não é possível deletar o pipeline padrão"));

    await this.repo.delete(id);
    return right(undefined);
  }
}
