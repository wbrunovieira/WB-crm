import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { LeadDuplicatesRepository, DuplicateCheckInput, DuplicateMatch } from "../repositories/lead-duplicates.repository";

export class NoCriteriaError extends Error { name = "NoCriteriaError"; }

@Injectable()
export class CheckLeadDuplicatesUseCase {
  constructor(private readonly repo: LeadDuplicatesRepository) {}

  async execute(input: DuplicateCheckInput): Promise<Either<NoCriteriaError, { duplicates: DuplicateMatch[]; hasDuplicates: boolean }>> {
    const hasCriteria = !!(input.cnpj || input.name || input.phone || input.email || input.address);
    if (!hasCriteria) {
      return left(new NoCriteriaError("Informe ao menos um critério de busca (CNPJ, nome, telefone, email ou endereço)"));
    }

    const duplicates = await this.repo.findDuplicates(input);
    return right({ duplicates, hasDuplicates: duplicates.length > 0 });
  }
}
