import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { TechProfileRepository, TechProfileType, TechProfileResult, TechProfileItem, TECH_PROFILE_TYPES } from "../repositories/tech-profile.repository";

export class InvalidTechProfileTypeError extends Error { name = "InvalidTechProfileTypeError"; }

function validateType(type: string): Either<InvalidTechProfileTypeError, TechProfileType> {
  if (!TECH_PROFILE_TYPES.includes(type as TechProfileType)) {
    return left(new InvalidTechProfileTypeError(`Tipo de tech profile inválido: ${type}`));
  }
  return right(type as TechProfileType);
}

// ── Get available items by type ───────────────────────────────────────────
@Injectable()
export class GetTechProfileItemsUseCase {
  constructor(private readonly repo: TechProfileRepository) {}

  async execute(type: string): Promise<Either<InvalidTechProfileTypeError, { items: TechProfileItem[] }>> {
    const typeResult = validateType(type);
    if (typeResult.isLeft()) return left(typeResult.value);
    const items = await this.repo.getAvailableItems(typeResult.value as TechProfileType);
    return right({ items });
  }
}

// ── Lead tech profile ─────────────────────────────────────────────────────
@Injectable()
export class GetLeadTechProfileUseCase {
  constructor(private readonly repo: TechProfileRepository) {}

  async execute(leadId: string): Promise<Either<never, { profile: TechProfileResult }>> {
    const profile = await this.repo.getLeadTechProfile(leadId);
    return right({ profile });
  }
}

@Injectable()
export class AddLeadTechProfileItemUseCase {
  constructor(private readonly repo: TechProfileRepository) {}

  async execute(leadId: string, type: string, itemId: string): Promise<Either<InvalidTechProfileTypeError, void>> {
    const typeResult = validateType(type);
    if (typeResult.isLeft()) return left(typeResult.value);
    await this.repo.addToLead(leadId, typeResult.value as TechProfileType, itemId);
    return right(undefined);
  }
}

@Injectable()
export class RemoveLeadTechProfileItemUseCase {
  constructor(private readonly repo: TechProfileRepository) {}

  async execute(leadId: string, type: string, itemId: string): Promise<Either<InvalidTechProfileTypeError, void>> {
    const typeResult = validateType(type);
    if (typeResult.isLeft()) return left(typeResult.value);
    await this.repo.removeFromLead(leadId, typeResult.value as TechProfileType, itemId);
    return right(undefined);
  }
}

// ── Organization tech profile ─────────────────────────────────────────────
@Injectable()
export class GetOrganizationTechProfileUseCase {
  constructor(private readonly repo: TechProfileRepository) {}

  async execute(organizationId: string): Promise<Either<never, { profile: TechProfileResult }>> {
    const profile = await this.repo.getOrganizationTechProfile(organizationId);
    return right({ profile });
  }
}

@Injectable()
export class AddOrganizationTechProfileItemUseCase {
  constructor(private readonly repo: TechProfileRepository) {}

  async execute(organizationId: string, type: string, itemId: string): Promise<Either<InvalidTechProfileTypeError, void>> {
    const typeResult = validateType(type);
    if (typeResult.isLeft()) return left(typeResult.value);
    await this.repo.addToOrganization(organizationId, typeResult.value as TechProfileType, itemId);
    return right(undefined);
  }
}

@Injectable()
export class RemoveOrganizationTechProfileItemUseCase {
  constructor(private readonly repo: TechProfileRepository) {}

  async execute(organizationId: string, type: string, itemId: string): Promise<Either<InvalidTechProfileTypeError, void>> {
    const typeResult = validateType(type);
    if (typeResult.isLeft()) return left(typeResult.value);
    await this.repo.removeFromOrganization(organizationId, typeResult.value as TechProfileType, itemId);
    return right(undefined);
  }
}
