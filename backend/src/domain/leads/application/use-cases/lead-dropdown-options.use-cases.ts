import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { LeadDropdownOptionsRepository, type LeadDropdownOptionRecord } from "../repositories/lead-dropdown-options.repository";

@Injectable()
export class GetLeadDropdownOptionsUseCase {
  constructor(private readonly repo: LeadDropdownOptionsRepository) {}

  async execute(ownerId: string, category: string): Promise<Either<never, { options: LeadDropdownOptionRecord[] }>> {
    const options = await this.repo.findByCategory(ownerId, category);
    return right({ options });
  }
}

@Injectable()
export class CreateLeadDropdownOptionUseCase {
  constructor(private readonly repo: LeadDropdownOptionsRepository) {}

  async execute(input: {
    name: string;
    category: string;
    ownerId: string;
  }): Promise<Either<Error, { option: LeadDropdownOptionRecord }>> {
    const trimmed = input.name.trim();

    if (!trimmed || trimmed.length < 2) {
      return left(new Error("Nome deve ter no mínimo 2 caracteres"));
    }

    try {
      const option = await this.repo.create({ name: trimmed, category: input.category, ownerId: input.ownerId });
      return right({ option });
    } catch {
      return left(new Error("Opção já cadastrada"));
    }
  }
}
