import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { OrganizationsRepository } from "../repositories/organizations.repository";

/**
 * Ordem manual das atividades de uma organizacao — espelho do equivalente em Lead.
 *
 * A coluna `activityOrder` ja existia nos dois modelos; faltava a rota do lado da
 * organizacao, e era isso que impedia a pagina do cliente de usar o mesmo componente de
 * atividades do lead.
 */
@Injectable()
export class UpdateOrganizationActivityOrderUseCase {
  constructor(private readonly organizations: OrganizationsRepository) {}

  async execute(input: {
    organizationId: string;
    activityIds: string[];
    requesterId: string;
    requesterRole: string;
  }): Promise<Either<Error, void>> {
    if (input.activityIds.length === 0) {
      return left(new Error("Lista de atividades não pode ser vazia"));
    }

    const organization = await this.organizations.findByIdRaw(input.organizationId);
    if (!organization) return left(new Error("Organização não encontrada"));

    if (input.requesterRole !== "admin" && organization.ownerId !== input.requesterId) {
      return left(new Error("Não autorizado"));
    }

    organization.update({ activityOrder: JSON.stringify(input.activityIds) });
    await this.organizations.save(organization);
    return right(undefined);
  }
}

@Injectable()
export class ResetOrganizationActivityOrderUseCase {
  constructor(private readonly organizations: OrganizationsRepository) {}

  async execute(input: {
    organizationId: string;
    requesterId: string;
    requesterRole: string;
  }): Promise<Either<Error, void>> {
    const organization = await this.organizations.findByIdRaw(input.organizationId);
    if (!organization) return left(new Error("Organização não encontrada"));

    if (input.requesterRole !== "admin" && organization.ownerId !== input.requesterId) {
      return left(new Error("Não autorizado"));
    }

    organization.update({ activityOrder: undefined });
    await this.organizations.save(organization);
    return right(undefined);
  }
}
