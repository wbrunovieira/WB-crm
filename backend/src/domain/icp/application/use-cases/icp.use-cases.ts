import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { ICP } from "../../enterprise/entities/icp";
import { ICPRepository, ICPLinkData, LeadICPRecord, OrganizationICPRecord, ICPVersionRecord } from "../repositories/icp.repository";

export class ICPNotFoundError extends Error { name = "ICPNotFoundError"; }
export class DuplicateICPError extends Error { name = "DuplicateICPError"; }
export class ICPForbiddenError extends Error { name = "ICPForbiddenError"; }

// ── Get all ICPs for user ──────────────────────────────────────────────────
@Injectable()
export class GetICPsUseCase {
  constructor(private readonly repo: ICPRepository) {}

  async execute(ownerId: string, status?: string): Promise<Either<never, { icps: ICP[] }>> {
    const all = await this.repo.findByOwner(ownerId);
    const icps = status ? all.filter((icp) => icp.statusValue === status) : all;
    return right({ icps });
  }
}

// ── Get ICP by ID ──────────────────────────────────────────────────────────
@Injectable()
export class GetICPByIdUseCase {
  constructor(private readonly repo: ICPRepository) {}

  async execute(id: string, requesterId: string): Promise<Either<ICPNotFoundError | ICPForbiddenError, { icp: ICP }>> {
    const icp = await this.repo.findById(id);
    if (!icp) return left(new ICPNotFoundError("ICP não encontrado"));
    if (icp.ownerId !== requesterId) return left(new ICPForbiddenError("Acesso negado ao ICP"));
    return right({ icp });
  }
}

// ── Create ICP ────────────────────────────────────────────────────────────
@Injectable()
export class CreateICPUseCase {
  constructor(private readonly repo: ICPRepository) {}

  async execute(data: {
    name: string;
    slug?: string;
    content: string;
    status?: string;
    ownerId: string;
  }): Promise<Either<Error, { icp: ICP }>> {
    const slug = data.slug ?? ICP.slugFromName(data.name);
    const alreadyExists = await this.repo.existsBySlugAndOwner(slug, data.ownerId);
    if (alreadyExists) return left(new DuplicateICPError("ICP com esse slug já existe"));

    const result = ICP.create({ name: data.name, slug, content: data.content, ownerId: data.ownerId });
    if (result.isLeft()) return left(result.value);
    const icp = result.value as ICP;

    if (data.status) {
      const updateResult = icp.update({ status: data.status });
      if (updateResult.isLeft()) return left(updateResult.value);
    }

    await this.repo.save(icp);
    return right({ icp });
  }
}

// ── Update ICP ────────────────────────────────────────────────────────────
@Injectable()
export class UpdateICPUseCase {
  constructor(private readonly repo: ICPRepository) {}

  async execute(data: {
    id: string;
    name?: string;
    slug?: string;
    content?: string;
    status?: string;
    requesterId: string;
  }): Promise<Either<Error, { icp: ICP }>> {
    const icp = await this.repo.findById(data.id);
    if (!icp) return left(new ICPNotFoundError("ICP não encontrado"));
    if (icp.ownerId !== data.requesterId) return left(new ICPForbiddenError("Acesso negado"));

    if (data.slug) {
      const dup = await this.repo.existsBySlugAndOwner(data.slug, data.requesterId);
      if (dup && data.slug !== icp.slug) return left(new DuplicateICPError("Slug já em uso"));
    }

    const updateResult = icp.update({ name: data.name, slug: data.slug, content: data.content, status: data.status });
    if (updateResult.isLeft()) return left(updateResult.value);

    await this.repo.save(icp);
    return right({ icp });
  }
}

// ── Delete ICP ────────────────────────────────────────────────────────────
@Injectable()
export class DeleteICPUseCase {
  constructor(private readonly repo: ICPRepository) {}

  async execute(id: string, requesterId: string): Promise<Either<ICPNotFoundError | ICPForbiddenError, void>> {
    const icp = await this.repo.findById(id);
    if (!icp) return left(new ICPNotFoundError("ICP não encontrado"));
    if (icp.ownerId !== requesterId) return left(new ICPForbiddenError("Acesso negado"));
    await this.repo.delete(id);
    return right(undefined);
  }
}

// ── Lead link use cases ───────────────────────────────────────────────────
@Injectable()
export class GetLeadICPsUseCase {
  constructor(private readonly repo: ICPRepository) {}
  async execute(leadId: string): Promise<Either<never, { links: LeadICPRecord[] }>> {
    const links = await this.repo.getLeadICPs(leadId);
    return right({ links });
  }
}

@Injectable()
export class LinkLeadToICPUseCase {
  constructor(private readonly repo: ICPRepository) {}

  async execute(data: { icpId: string; leadId: string; requesterId: string } & ICPLinkData): Promise<Either<ICPNotFoundError | ICPForbiddenError, void>> {
    const { icpId, leadId, requesterId, ...linkData } = data;
    const icp = await this.repo.findById(icpId);
    if (!icp) return left(new ICPNotFoundError("ICP não encontrado"));
    if (icp.ownerId !== requesterId) return left(new ICPForbiddenError("Acesso negado ao ICP"));
    await this.repo.linkToLead(icpId, leadId, linkData);
    return right(undefined);
  }
}

@Injectable()
export class UpdateLeadICPUseCase {
  constructor(private readonly repo: ICPRepository) {}

  async execute(data: { icpId: string; leadId: string; requesterId: string } & ICPLinkData): Promise<Either<ICPNotFoundError | ICPForbiddenError, void>> {
    const { icpId, leadId, requesterId, ...linkData } = data;
    const icp = await this.repo.findById(icpId);
    if (!icp) return left(new ICPNotFoundError("ICP não encontrado"));
    if (icp.ownerId !== requesterId) return left(new ICPForbiddenError("Acesso negado ao ICP"));
    await this.repo.updateLeadLink(icpId, leadId, linkData);
    return right(undefined);
  }
}

@Injectable()
export class UnlinkLeadFromICPUseCase {
  constructor(private readonly repo: ICPRepository) {}

  async execute(icpId: string, leadId: string, requesterId: string): Promise<Either<ICPNotFoundError | ICPForbiddenError, void>> {
    const icp = await this.repo.findById(icpId);
    if (!icp) return left(new ICPNotFoundError("ICP não encontrado"));
    if (icp.ownerId !== requesterId) return left(new ICPForbiddenError("Acesso negado ao ICP"));
    await this.repo.unlinkFromLead(icpId, leadId);
    return right(undefined);
  }
}

// ── Organization link use cases ───────────────────────────────────────────
@Injectable()
export class GetOrganizationICPsUseCase {
  constructor(private readonly repo: ICPRepository) {}
  async execute(organizationId: string): Promise<Either<never, { links: OrganizationICPRecord[] }>> {
    const links = await this.repo.getOrganizationICPs(organizationId);
    return right({ links });
  }
}

@Injectable()
export class LinkOrganizationToICPUseCase {
  constructor(private readonly repo: ICPRepository) {}

  async execute(data: { icpId: string; organizationId: string; requesterId: string } & ICPLinkData): Promise<Either<ICPNotFoundError | ICPForbiddenError, void>> {
    const { icpId, organizationId, requesterId, ...linkData } = data;
    const icp = await this.repo.findById(icpId);
    if (!icp) return left(new ICPNotFoundError("ICP não encontrado"));
    if (icp.ownerId !== requesterId) return left(new ICPForbiddenError("Acesso negado ao ICP"));
    await this.repo.linkToOrganization(icpId, organizationId, linkData);
    return right(undefined);
  }
}

@Injectable()
export class UpdateOrganizationICPUseCase {
  constructor(private readonly repo: ICPRepository) {}

  async execute(data: { icpId: string; organizationId: string; requesterId: string } & ICPLinkData): Promise<Either<ICPNotFoundError | ICPForbiddenError, void>> {
    const { icpId, organizationId, requesterId, ...linkData } = data;
    const icp = await this.repo.findById(icpId);
    if (!icp) return left(new ICPNotFoundError("ICP não encontrado"));
    if (icp.ownerId !== requesterId) return left(new ICPForbiddenError("Acesso negado ao ICP"));
    await this.repo.updateOrganizationLink(icpId, organizationId, linkData);
    return right(undefined);
  }
}

@Injectable()
export class UnlinkOrganizationFromICPUseCase {
  constructor(private readonly repo: ICPRepository) {}

  async execute(icpId: string, organizationId: string, requesterId: string): Promise<Either<ICPNotFoundError | ICPForbiddenError, void>> {
    const icp = await this.repo.findById(icpId);
    if (!icp) return left(new ICPNotFoundError("ICP não encontrado"));
    if (icp.ownerId !== requesterId) return left(new ICPForbiddenError("Acesso negado ao ICP"));
    await this.repo.unlinkFromOrganization(icpId, organizationId);
    return right(undefined);
  }
}

// ── ICP Versions ──────────────────────────────────────────────────────────────

export class ICPVersionNotFoundError extends Error { name = "ICPVersionNotFoundError"; }

@Injectable()
export class GetICPVersionsUseCase {
  constructor(private readonly repo: ICPRepository) {}

  async execute(icpId: string, requesterId: string): Promise<Either<ICPNotFoundError | ICPForbiddenError, { versions: ICPVersionRecord[] }>> {
    const icp = await this.repo.findById(icpId);
    if (!icp) return left(new ICPNotFoundError("ICP não encontrado"));
    if (icp.ownerId !== requesterId) return left(new ICPForbiddenError("Acesso negado ao ICP"));
    const versions = await this.repo.getVersions(icpId);
    return right({ versions });
  }
}

@Injectable()
export class RestoreICPVersionUseCase {
  constructor(private readonly repo: ICPRepository) {}

  async execute(input: { icpId: string; versionId: string; requesterId: string }): Promise<Either<Error, { icp: ICP }>> {
    const icp = await this.repo.findById(input.icpId);
    if (!icp) return left(new ICPNotFoundError("ICP não encontrado"));
    if (icp.ownerId !== input.requesterId) return left(new ICPForbiddenError("Acesso negado ao ICP"));

    const version = await this.repo.getVersionById(input.versionId);
    if (!version || version.icpId !== input.icpId) return left(new ICPVersionNotFoundError("Versão não encontrada"));

    // Save current state as a new version before restoring
    const currentVersions = await this.repo.getVersions(input.icpId);
    const nextVersionNumber = (currentVersions[0]?.versionNumber ?? 0) + 1;
    await this.repo.createVersion({
      icpId: input.icpId,
      versionNumber: nextVersionNumber,
      name: icp.name,
      content: icp.content,
      status: icp.statusValue,
      changedBy: input.requesterId,
      changeReason: `Antes da restauração para versão ${version.versionNumber}`,
    });

    icp.update({ name: version.name, content: version.content, status: version.status });
    await this.repo.save(icp);
    return right({ icp });
  }
}
