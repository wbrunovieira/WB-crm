import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { OrganizationsRepository } from "../repositories/organizations.repository";

export class OrgNotFoundError extends Error { name = "OrgNotFoundError"; }

@Injectable()
export class LinkExternalProjectUseCase {
  constructor(private readonly repo: OrganizationsRepository) {}

  async execute(input: { orgId: string; projectId: string; requesterId: string; requesterRole: string }): Promise<Either<OrgNotFoundError, { projectIds: string[] }>> {
    const org = await this.repo.findByIdRaw(input.orgId);
    if (!org) return left(new OrgNotFoundError("Organização não encontrada"));
    if (input.requesterRole !== "admin" && org.ownerId !== input.requesterId) {
      return left(new OrgNotFoundError("Acesso negado"));
    }
    const projectIds = await this.repo.linkExternalProject(input.orgId, input.projectId);
    return right({ projectIds });
  }
}

@Injectable()
export class UnlinkExternalProjectUseCase {
  constructor(private readonly repo: OrganizationsRepository) {}

  async execute(input: { orgId: string; projectId: string; requesterId: string; requesterRole: string }): Promise<Either<OrgNotFoundError, { projectIds: string[] }>> {
    const org = await this.repo.findByIdRaw(input.orgId);
    if (!org) return left(new OrgNotFoundError("Organização não encontrada"));
    if (input.requesterRole !== "admin" && org.ownerId !== input.requesterId) {
      return left(new OrgNotFoundError("Acesso negado"));
    }
    const projectIds = await this.repo.unlinkExternalProject(input.orgId, input.projectId);
    return right({ projectIds });
  }
}
