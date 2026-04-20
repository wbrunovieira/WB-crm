import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { LeadsRepository } from "../repositories/leads.repository";

export class QualifyLeadNotFoundError extends Error { name = "QualifyLeadNotFoundError"; }
export class QualifyLeadForbiddenError extends Error { name = "QualifyLeadForbiddenError"; }

@Injectable()
export class QualifyLeadUseCase {
  constructor(private readonly repo: LeadsRepository) {}

  async execute(input: { id: string; requesterId: string; requesterRole: string }): Promise<Either<Error, void>> {
    const lead = await this.repo.findByIdRaw(input.id);
    if (!lead) return left(new QualifyLeadNotFoundError("Lead não encontrado"));
    if (lead.ownerId !== input.requesterId && input.requesterRole !== "admin") {
      return left(new QualifyLeadForbiddenError("Acesso negado"));
    }
    lead.qualify();
    await this.repo.save(lead);
    return right(undefined);
  }
}
