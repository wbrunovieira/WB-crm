import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { LeadDuplicatesRepository, DuplicateCheckInput, DuplicateMatch, GroupedDuplicates } from "../repositories/lead-duplicates.repository";

export class NoCriteriaError extends Error { name = "NoCriteriaError"; }

@Injectable()
export class CheckLeadDuplicatesUseCase {
  constructor(private readonly repo: LeadDuplicatesRepository) {}

  async execute(input: DuplicateCheckInput): Promise<Either<NoCriteriaError, GroupedDuplicates>> {
    const hasCriteria = !!(input.cnpj || input.name || input.phone || input.email || input.address);
    if (!hasCriteria) {
      return left(new NoCriteriaError("Informe ao menos um critério de busca (CNPJ, nome, telefone, email ou endereço)"));
    }

    const matches = await this.repo.findDuplicates(input);
    const grouped: GroupedDuplicates = { cnpj: [], name: [], phone: [], email: [], address: [] };
    for (const m of matches) {
      for (const field of m.matchedFields) {
        if (field in grouped) grouped[field as keyof GroupedDuplicates].push(m);
      }
    }
    return right(grouped);
  }
}
