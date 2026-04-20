import { Injectable } from "@nestjs/common";
import { right, type Either } from "@/core/either";
import { LeadsRepository, type LeadFilters, type PaginatedLeads } from "../repositories/leads.repository";

interface Input {
  requesterId: string;
  requesterRole: string;
  filters?: LeadFilters;
}

type Output = Either<never, PaginatedLeads>;

@Injectable()
export class GetLeadsUseCase {
  constructor(private readonly leads: LeadsRepository) {}

  async execute({ requesterId, requesterRole, filters = {} }: Input): Promise<Output> {
    const result = await this.leads.findMany(requesterId, requesterRole, filters);
    return right(result);
  }
}
