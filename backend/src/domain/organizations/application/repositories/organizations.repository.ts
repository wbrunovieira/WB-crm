import type { Organization } from "../../enterprise/entities/organization";
import type { OrganizationSummary, OrganizationDetail } from "../../enterprise/read-models/organization-read-models";

export interface OrganizationFilters {
  search?: string;
  owner?: string; // "all", "mine", or userId — admin only
  hasHosting?: boolean;
  ownerId: string; // requester's own id (always required)
}

export abstract class OrganizationsRepository {
  abstract findMany(requesterId: string, requesterRole: string, filters?: Omit<OrganizationFilters, "ownerId">): Promise<OrganizationSummary[]>;
  abstract findById(id: string, requesterId: string, requesterRole: string): Promise<OrganizationDetail | null>;
  abstract findByIdRaw(id: string): Promise<Organization | null>;
  abstract save(organization: Organization): Promise<void>;
  abstract saveWithLabels(organization: Organization, labelIds: string[]): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
