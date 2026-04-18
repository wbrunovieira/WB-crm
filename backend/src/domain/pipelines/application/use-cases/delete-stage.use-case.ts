import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { PipelinesRepository } from "../repositories/pipelines.repository";

type Output = Either<Error, void>;

@Injectable()
export class DeleteStageUseCase {
  constructor(private readonly repo: PipelinesRepository) {}

  async execute(id: string): Promise<Output> {
    const stage = await this.repo.findStageById(id);
    if (!stage) return left(new Error("Estágio não encontrado"));

    const dealCount = await this.repo.countDealsInStage(id);
    if (dealCount > 0) {
      return left(new Error(`Não é possível deletar: estágio possui ${dealCount} deal(s) vinculado(s)`));
    }

    await this.repo.deleteStage(id);
    return right(undefined);
  }
}
