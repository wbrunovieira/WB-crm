import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { Sector, UpdateSectorInput } from "../../enterprise/entities/sector";
import { SectorName } from "../../enterprise/value-objects/sector-name.vo";
import { SectorSlug } from "../../enterprise/value-objects/sector-slug.vo";
import { SectorsRepository } from "../repositories/sectors.repository";

export class SectorNotFoundError extends Error {
  constructor() { super("Setor não encontrado"); this.name = "SectorNotFoundError"; }
}
export class DuplicateSectorError extends Error {
  constructor() { super("Já existe um setor com esse slug"); this.name = "DuplicateSectorError"; }
}
export class SectorForbiddenError extends Error {
  constructor() { super("Setor não pertence a este usuário"); this.name = "SectorForbiddenError"; }
}

// ─── GetSectors ──────────────────────────────────────────────────────────────

@Injectable()
export class GetSectorsUseCase {
  constructor(private readonly repo: SectorsRepository) {}
  async execute(ownerId: string): Promise<Either<never, { sectors: Sector[] }>> {
    return right({ sectors: await this.repo.findByOwner(ownerId) });
  }
}

// ─── GetSectorById ───────────────────────────────────────────────────────────

@Injectable()
export class GetSectorByIdUseCase {
  constructor(private readonly repo: SectorsRepository) {}
  async execute(id: string, requesterId: string): Promise<Either<SectorNotFoundError, { sector: Sector }>> {
    const sector = await this.repo.findById(id);
    if (!sector) return left(new SectorNotFoundError());
    if (sector.ownerId !== requesterId) return left(new SectorNotFoundError());
    return right({ sector });
  }
}

// ─── CreateSector ────────────────────────────────────────────────────────────

export interface CreateSectorInput {
  name: string;
  slug?: string;
  description?: string;
  ownerId: string;
  [key: string]: unknown;
}

@Injectable()
export class CreateSectorUseCase {
  constructor(private readonly repo: SectorsRepository) {}

  async execute(input: CreateSectorInput): Promise<Either<Error, { sector: Sector }>> {
    const nameOrError = SectorName.create(input.name);
    if (nameOrError.isLeft()) return left(nameOrError.value);

    const rawSlug = input.slug ?? input.name;
    const slugOrError = input.slug
      ? SectorSlug.create(input.slug)
      : SectorSlug.fromName(input.name);
    if (slugOrError.isLeft()) return left(slugOrError.value);

    const exists = await this.repo.existsBySlugAndOwner(slugOrError.value.toString(), input.ownerId);
    if (exists) return left(new DuplicateSectorError());

    const sector = Sector.create({
      name: nameOrError.value,
      slug: slugOrError.value,
      description: input.description as string | undefined,
      isActive: true,
      ownerId: input.ownerId,
    });
    await this.repo.save(sector);
    return right({ sector });
  }
}

// ─── UpdateSector ────────────────────────────────────────────────────────────

export interface UpdateSectorUseCaseInput extends UpdateSectorInput {
  id: string;
  requesterId: string;
}

@Injectable()
export class UpdateSectorUseCase {
  constructor(private readonly repo: SectorsRepository) {}

  async execute(input: UpdateSectorUseCaseInput): Promise<Either<Error, { sector: Sector }>> {
    const sector = await this.repo.findById(input.id);
    if (!sector) return left(new SectorNotFoundError());
    if (sector.ownerId !== input.requesterId) return left(new SectorNotFoundError());

    if (input.slug !== undefined) {
      const exists = await this.repo.existsBySlugAndOwner(input.slug, input.requesterId);
      if (exists && input.slug !== sector.slug) return left(new DuplicateSectorError());
    }

    const result = sector.update(input);
    if (result.isLeft()) return left(result.value);
    await this.repo.save(sector);
    return right({ sector });
  }
}

// ─── DeleteSector ────────────────────────────────────────────────────────────

@Injectable()
export class DeleteSectorUseCase {
  constructor(private readonly repo: SectorsRepository) {}

  async execute(id: string, requesterId: string): Promise<Either<SectorNotFoundError, void>> {
    const sector = await this.repo.findById(id);
    if (!sector) return left(new SectorNotFoundError());
    if (sector.ownerId !== requesterId) return left(new SectorNotFoundError());
    await this.repo.delete(id);
    return right(undefined);
  }
}

// ─── GetLeadSectors ──────────────────────────────────────────────────────────

@Injectable()
export class GetLeadSectorsUseCase {
  constructor(private readonly repo: SectorsRepository) {}
  async execute(leadId: string): Promise<Either<never, { sectors: Sector[] }>> {
    return right({ sectors: await this.repo.findByLead(leadId) });
  }
}

// ─── GetOrgSectors ───────────────────────────────────────────────────────────

@Injectable()
export class GetOrgSectorsUseCase {
  constructor(private readonly repo: SectorsRepository) {}
  async execute(orgId: string): Promise<Either<never, { sectors: Sector[] }>> {
    return right({ sectors: await this.repo.findByOrganization(orgId) });
  }
}

// ─── Link/Unlink ─────────────────────────────────────────────────────────────

export interface SectorLinkInput {
  sectorId: string;
  entityId: string;
  requesterId: string;
}

@Injectable()
export class LinkSectorToLeadUseCase {
  constructor(private readonly repo: SectorsRepository) {}
  async execute(input: SectorLinkInput): Promise<Either<SectorNotFoundError | SectorForbiddenError, void>> {
    const sector = await this.repo.findById(input.sectorId);
    if (!sector) return left(new SectorNotFoundError());
    if (sector.ownerId !== input.requesterId) return left(new SectorForbiddenError());
    await this.repo.addToLead(input.sectorId, input.entityId);
    return right(undefined);
  }
}

@Injectable()
export class UnlinkSectorFromLeadUseCase {
  constructor(private readonly repo: SectorsRepository) {}
  async execute(input: SectorLinkInput): Promise<Either<SectorNotFoundError | SectorForbiddenError, void>> {
    const sector = await this.repo.findById(input.sectorId);
    if (!sector) return left(new SectorNotFoundError());
    if (sector.ownerId !== input.requesterId) return left(new SectorForbiddenError());
    await this.repo.removeFromLead(input.sectorId, input.entityId);
    return right(undefined);
  }
}

@Injectable()
export class LinkSectorToOrganizationUseCase {
  constructor(private readonly repo: SectorsRepository) {}
  async execute(input: SectorLinkInput): Promise<Either<SectorNotFoundError | SectorForbiddenError, void>> {
    const sector = await this.repo.findById(input.sectorId);
    if (!sector) return left(new SectorNotFoundError());
    if (sector.ownerId !== input.requesterId) return left(new SectorForbiddenError());
    await this.repo.addToOrganization(input.sectorId, input.entityId);
    return right(undefined);
  }
}

@Injectable()
export class UnlinkSectorFromOrganizationUseCase {
  constructor(private readonly repo: SectorsRepository) {}
  async execute(input: SectorLinkInput): Promise<Either<SectorNotFoundError | SectorForbiddenError, void>> {
    const sector = await this.repo.findById(input.sectorId);
    if (!sector) return left(new SectorNotFoundError());
    if (sector.ownerId !== input.requesterId) return left(new SectorForbiddenError());
    await this.repo.removeFromOrganization(input.sectorId, input.entityId);
    return right(undefined);
  }
}
