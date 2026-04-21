import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { CnaeRepository, CnaeRecord } from "../repositories/cnae.repository";

export class CnaeNotFoundError extends Error {
  constructor() { super("CNAE não encontrado"); this.name = "CnaeNotFoundError"; }
}

// ─── SearchCNAEs ─────────────────────────────────────────────────────────────

@Injectable()
export class SearchCnaesUseCase {
  constructor(private readonly repo: CnaeRepository) {}

  async execute(query: string): Promise<Either<never, { cnaes: CnaeRecord[] }>> {
    const cnaes = await this.repo.search(query.trim(), 20);
    return right({ cnaes });
  }
}

// ─── GetCNAEById ─────────────────────────────────────────────────────────────

@Injectable()
export class GetCnaeByIdUseCase {
  constructor(private readonly repo: CnaeRepository) {}

  async execute(id: string): Promise<Either<CnaeNotFoundError, { cnae: CnaeRecord }>> {
    const cnae = await this.repo.findById(id);
    if (!cnae) return left(new CnaeNotFoundError());
    return right({ cnae });
  }
}

// ─── ListSecondaryCNAEs ───────────────────────────────────────────────────────

@Injectable()
export class ListSecondaryCnaesForLeadUseCase {
  constructor(private readonly repo: CnaeRepository) {}
  async execute(leadId: string): Promise<Either<never, { cnaes: CnaeRecord[] }>> {
    const cnaes = await this.repo.listForLead(leadId);
    return right({ cnaes });
  }
}

@Injectable()
export class ListSecondaryCnaesForOrganizationUseCase {
  constructor(private readonly repo: CnaeRepository) {}
  async execute(organizationId: string): Promise<Either<never, { cnaes: CnaeRecord[] }>> {
    const cnaes = await this.repo.listForOrganization(organizationId);
    return right({ cnaes });
  }
}

// ─── AddSecondaryCNAEToLead ───────────────────────────────────────────────────

export interface CnaeLinkInput {
  cnaeId: string;
  entityId: string;
}

@Injectable()
export class AddSecondaryCnaeToLeadUseCase {
  constructor(private readonly repo: CnaeRepository) {}

  async execute(input: CnaeLinkInput): Promise<Either<CnaeNotFoundError, void>> {
    const cnae = await this.repo.findById(input.cnaeId);
    if (!cnae) return left(new CnaeNotFoundError());
    await this.repo.addToLead(input.cnaeId, input.entityId);
    return right(undefined);
  }
}

@Injectable()
export class RemoveSecondaryCnaeFromLeadUseCase {
  constructor(private readonly repo: CnaeRepository) {}

  async execute(input: CnaeLinkInput): Promise<Either<CnaeNotFoundError, void>> {
    const cnae = await this.repo.findById(input.cnaeId);
    if (!cnae) return left(new CnaeNotFoundError());
    await this.repo.removeFromLead(input.cnaeId, input.entityId);
    return right(undefined);
  }
}

// ─── AddSecondaryCNAEToOrganization ──────────────────────────────────────────

@Injectable()
export class AddSecondaryCnaeToOrganizationUseCase {
  constructor(private readonly repo: CnaeRepository) {}

  async execute(input: CnaeLinkInput): Promise<Either<CnaeNotFoundError, void>> {
    const cnae = await this.repo.findById(input.cnaeId);
    if (!cnae) return left(new CnaeNotFoundError());
    await this.repo.addToOrganization(input.cnaeId, input.entityId);
    return right(undefined);
  }
}

@Injectable()
export class RemoveSecondaryCnaeFromOrganizationUseCase {
  constructor(private readonly repo: CnaeRepository) {}

  async execute(input: CnaeLinkInput): Promise<Either<CnaeNotFoundError, void>> {
    const cnae = await this.repo.findById(input.cnaeId);
    if (!cnae) return left(new CnaeNotFoundError());
    await this.repo.removeFromOrganization(input.cnaeId, input.entityId);
    return right(undefined);
  }
}
