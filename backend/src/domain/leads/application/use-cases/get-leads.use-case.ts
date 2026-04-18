import { Injectable } from "@nestjs/common";
import { right, type Either } from "@/core/either";
import { LeadsRepository, type LeadFilters } from "../repositories/leads.repository";
import type { LeadSummary } from "../../enterprise/read-models/lead-read-models";

interface Input {
  requesterId: string;
  requesterRole: string;
  filters?: LeadFilters;
}

type Output = Either<never, { leads: LeadSummary[] }>;

@Injectable()
export class GetLeadsUseCase {
  constructor(private readonly leads: LeadsRepository) {}

  async execute({ requesterId, requesterRole, filters = {} }: Input): Promise<Output> {
    const leads = await this.leads.findMany(requesterId, requesterRole, filters);
    return right({ leads });
  }
}
