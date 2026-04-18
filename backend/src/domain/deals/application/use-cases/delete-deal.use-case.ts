import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { DealsRepository } from "../repositories/deals.repository";

export interface DeleteDealInput {
  id: string;
  requesterId: string;
  requesterRole: string;
}

type Output = Either<Error, void>;

@Injectable()
export class DeleteDealUseCase {
  constructor(private readonly deals: DealsRepository) {}

  async execute(input: DeleteDealInput): Promise<Output> {
    const deal = await this.deals.findByIdRaw(input.id);
    if (!deal) return left(new Error("Deal não encontrado"));

    const isOwner = deal.ownerId === input.requesterId;
    const isAdmin = input.requesterRole === "admin";
    if (!isOwner && !isAdmin) return left(new Error("Não autorizado"));

    await this.deals.delete(input.id);
    return right(undefined);
  }
}
