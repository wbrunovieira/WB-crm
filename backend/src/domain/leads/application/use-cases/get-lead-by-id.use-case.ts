import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { LeadsRepository } from "../repositories/leads.repository";
import type { LeadDetail } from "../../enterprise/read-models/lead-read-models";

interface Input {
  id: string;
  requesterId: string;
  requesterRole: string;
}

type Output = Either<Error, { lead: LeadDetail }>;

@Injectable()
export class GetLeadByIdUseCase {
  constructor(private readonly leads: LeadsRepository) {}

  async execute({ id, requesterId, requesterRole }: Input): Promise<Output> {
    const lead = await this.leads.findById(id, requesterId, requesterRole);
    if (!lead) return left(new Error("Lead não encontrado"));
    return right({ lead });
  }
}
