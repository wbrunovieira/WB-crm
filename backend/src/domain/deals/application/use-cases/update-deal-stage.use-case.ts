import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { DealsRepository } from "../repositories/deals.repository";
import type { Deal } from "../../enterprise/entities/deal";

export interface UpdateDealStageInput {
  id: string;
  stageId: string;
  requesterId: string;
  requesterRole: string;
}

type Output = Either<Error, { deal: Deal }>;

@Injectable()
export class UpdateDealStageUseCase {
  constructor(private readonly deals: DealsRepository) {}

  async execute(input: UpdateDealStageInput): Promise<Output> {
    const deal = await this.deals.findByIdRaw(input.id);
    if (!deal) return left(new Error("Deal não encontrado"));

    const isOwner = deal.ownerId === input.requesterId;
    const isAdmin = input.requesterRole === "admin";
    if (!isOwner && !isAdmin) return left(new Error("Não autorizado"));

    const stage = await this.deals.findStageById(input.stageId);
    if (!stage) return left(new Error("Etapa não encontrada"));

    const previousStageId = deal.stageId;
    deal.changeStage(input.stageId, stage.probability);

    await this.deals.save(deal);

    await this.deals.createStageHistory({
      dealId: deal.id.toString(),
      fromStageId: previousStageId,
      toStageId: input.stageId,
      changedById: input.requesterId,
    });

    return right({ deal });
  }
}
