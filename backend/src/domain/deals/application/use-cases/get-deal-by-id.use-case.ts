import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { DealsRepository } from "../repositories/deals.repository";
import type { DealDetail } from "../../enterprise/read-models/deal-read-models";

export interface GetDealByIdInput {
  id: string;
  requesterId: string;
  requesterRole: string;
}

type Output = Either<Error, { deal: DealDetail }>;

@Injectable()
export class GetDealByIdUseCase {
  constructor(private readonly deals: DealsRepository) {}

  async execute(input: GetDealByIdInput): Promise<Output> {
    const deal = await this.deals.findById(input.id, input.requesterId, input.requesterRole);
    if (!deal) return left(new Error("Deal não encontrado"));
    return right({ deal });
  }
}
