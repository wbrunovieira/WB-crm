import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { OrganizationsRepository } from "../repositories/organizations.repository";
import type { OrganizationDetail } from "../../enterprise/read-models/organization-read-models";

interface Input {
  id: string;
  requesterId: string;
  requesterRole: string;
}

type Output = Either<Error, { organization: OrganizationDetail }>;

@Injectable()
export class GetOrganizationByIdUseCase {
  constructor(private readonly organizations: OrganizationsRepository) {}

  async execute({ id, requesterId, requesterRole }: Input): Promise<Output> {
    const organization = await this.organizations.findById(id, requesterId, requesterRole);
    if (!organization) return left(new Error("Organização não encontrada"));
    return right({ organization });
  }
}
