import { Injectable } from "@nestjs/common";
import { right, type Either } from "@/core/either";
import { OrganizationsRepository } from "../repositories/organizations.repository";
import type { OrganizationSummary } from "../../enterprise/read-models/organization-read-models";

interface Input {
  requesterId: string;
  requesterRole: string;
  filters?: {
    search?: string;
    owner?: string;
    hasHosting?: boolean;
  };
}

type Output = Either<never, { organizations: OrganizationSummary[] }>;

@Injectable()
export class GetOrganizationsUseCase {
  constructor(private readonly organizations: OrganizationsRepository) {}

  async execute({ requesterId, requesterRole, filters = {} }: Input): Promise<Output> {
    const organizations = await this.organizations.findMany(requesterId, requesterRole, filters);
    return right({ organizations });
  }
}
