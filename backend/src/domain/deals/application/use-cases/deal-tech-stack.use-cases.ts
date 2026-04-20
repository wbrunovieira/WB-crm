import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { DealsRepository, DealTechStackRecord } from "../repositories/deals.repository";

export class DealNotFoundError extends Error { name = "DealNotFoundError"; }

@Injectable()
export class GetDealTechStackUseCase {
  constructor(private readonly repo: DealsRepository) {}

  async execute(input: { dealId: string; requesterId: string; requesterRole: string }): Promise<Either<Error, DealTechStackRecord>> {
    const deal = await this.repo.findByIdRaw(input.dealId);
    if (!deal) return left(new DealNotFoundError("Deal não encontrado"));
    if (input.requesterRole !== "admin" && deal.ownerId !== input.requesterId) {
      return left(new DealNotFoundError("Deal não encontrado"));
    }
    return right(await this.repo.getTechStack(input.dealId));
  }
}

@Injectable()
export class AddCategoryToDealUseCase {
  constructor(private readonly repo: DealsRepository) {}

  async execute(input: { dealId: string; categoryId: string; requesterId: string; requesterRole: string }): Promise<Either<Error, void>> {
    const deal = await this.repo.findByIdRaw(input.dealId);
    if (!deal) return left(new DealNotFoundError("Deal não encontrado"));
    if (input.requesterRole !== "admin" && deal.ownerId !== input.requesterId) {
      return left(new DealNotFoundError("Deal não encontrado"));
    }
    await this.repo.addCategory(input.dealId, input.categoryId);
    return right(undefined);
  }
}

@Injectable()
export class RemoveCategoryFromDealUseCase {
  constructor(private readonly repo: DealsRepository) {}

  async execute(input: { dealId: string; categoryId: string; requesterId: string; requesterRole: string }): Promise<Either<Error, void>> {
    const deal = await this.repo.findByIdRaw(input.dealId);
    if (!deal) return left(new DealNotFoundError("Deal não encontrado"));
    if (input.requesterRole !== "admin" && deal.ownerId !== input.requesterId) {
      return left(new DealNotFoundError("Deal não encontrado"));
    }
    await this.repo.removeCategory(input.dealId, input.categoryId);
    return right(undefined);
  }
}

@Injectable()
export class AddLanguageToDealUseCase {
  constructor(private readonly repo: DealsRepository) {}

  async execute(input: { dealId: string; languageId: string; isPrimary?: boolean; requesterId: string; requesterRole: string }): Promise<Either<Error, void>> {
    const deal = await this.repo.findByIdRaw(input.dealId);
    if (!deal) return left(new DealNotFoundError("Deal não encontrado"));
    if (input.requesterRole !== "admin" && deal.ownerId !== input.requesterId) {
      return left(new DealNotFoundError("Deal não encontrado"));
    }
    await this.repo.addLanguage(input.dealId, input.languageId, input.isPrimary);
    return right(undefined);
  }
}

@Injectable()
export class RemoveLanguageFromDealUseCase {
  constructor(private readonly repo: DealsRepository) {}

  async execute(input: { dealId: string; languageId: string; requesterId: string; requesterRole: string }): Promise<Either<Error, void>> {
    const deal = await this.repo.findByIdRaw(input.dealId);
    if (!deal) return left(new DealNotFoundError("Deal não encontrado"));
    if (input.requesterRole !== "admin" && deal.ownerId !== input.requesterId) {
      return left(new DealNotFoundError("Deal não encontrado"));
    }
    await this.repo.removeLanguage(input.dealId, input.languageId);
    return right(undefined);
  }
}

@Injectable()
export class SetPrimaryLanguageUseCase {
  constructor(private readonly repo: DealsRepository) {}

  async execute(input: { dealId: string; languageId: string; requesterId: string; requesterRole: string }): Promise<Either<Error, void>> {
    const deal = await this.repo.findByIdRaw(input.dealId);
    if (!deal) return left(new DealNotFoundError("Deal não encontrado"));
    if (input.requesterRole !== "admin" && deal.ownerId !== input.requesterId) {
      return left(new DealNotFoundError("Deal não encontrado"));
    }
    await this.repo.setPrimaryLanguage(input.dealId, input.languageId);
    return right(undefined);
  }
}

@Injectable()
export class AddFrameworkToDealUseCase {
  constructor(private readonly repo: DealsRepository) {}

  async execute(input: { dealId: string; frameworkId: string; requesterId: string; requesterRole: string }): Promise<Either<Error, void>> {
    const deal = await this.repo.findByIdRaw(input.dealId);
    if (!deal) return left(new DealNotFoundError("Deal não encontrado"));
    if (input.requesterRole !== "admin" && deal.ownerId !== input.requesterId) {
      return left(new DealNotFoundError("Deal não encontrado"));
    }
    await this.repo.addFramework(input.dealId, input.frameworkId);
    return right(undefined);
  }
}

@Injectable()
export class RemoveFrameworkFromDealUseCase {
  constructor(private readonly repo: DealsRepository) {}

  async execute(input: { dealId: string; frameworkId: string; requesterId: string; requesterRole: string }): Promise<Either<Error, void>> {
    const deal = await this.repo.findByIdRaw(input.dealId);
    if (!deal) return left(new DealNotFoundError("Deal não encontrado"));
    if (input.requesterRole !== "admin" && deal.ownerId !== input.requesterId) {
      return left(new DealNotFoundError("Deal não encontrado"));
    }
    await this.repo.removeFramework(input.dealId, input.frameworkId);
    return right(undefined);
  }
}
