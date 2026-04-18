import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { OrganizationsRepository } from "../repositories/organizations.repository";

interface Input {
  id: string;
  requesterId: string;
  requesterRole: string;
}

type Output = Either<Error, void>;

@Injectable()
export class DeleteOrganizationUseCase {
  constructor(private readonly organizations: OrganizationsRepository) {}

  async execute({ id, requesterId, requesterRole }: Input): Promise<Output> {
    const organization = await this.organizations.findByIdRaw(id);
    if (!organization) return left(new Error("Organização não encontrada"));

    if (requesterRole !== "admin" && organization.ownerId !== requesterId) {
      return left(new Error("Não autorizado"));
    }

    await this.organizations.delete(id);
    return right(undefined);
  }
}
