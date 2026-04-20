import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { DealsRepository } from "../repositories/deals.repository";

export class StageHistoryNotFoundError extends Error { name = "StageHistoryNotFoundError"; }

@Injectable()
export class UpdateStageHistoryDateUseCase {
  constructor(private readonly repo: DealsRepository) {}

  async execute(input: { historyId: string; changedAt: Date }): Promise<Either<Error, { dealId: string }>> {
    const result = await this.repo.updateStageHistoryDate(input.historyId, input.changedAt);
    if (!result) return left(new StageHistoryNotFoundError("Registro de histórico não encontrado"));
    return right(result);
  }
}
