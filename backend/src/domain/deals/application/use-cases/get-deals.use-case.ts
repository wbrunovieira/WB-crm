import { Injectable } from "@nestjs/common";
import { right, type Either } from "@/core/either";
import { DealsRepository, type DealFilters } from "../repositories/deals.repository";
import type { DealSummary } from "../../enterprise/read-models/deal-read-models";

export interface GetDealsInput {
  requesterId: string;
  requesterRole: string;
  filters?: DealFilters;
}

type Output = Either<never, { deals: DealSummary[] }>;

@Injectable()
export class GetDealsUseCase {
  constructor(private readonly deals: DealsRepository) {}

  async execute(input: GetDealsInput): Promise<Output> {
    const deals = await this.deals.findMany(input.requesterId, input.requesterRole, input.filters);
    return right({ deals });
  }
}
