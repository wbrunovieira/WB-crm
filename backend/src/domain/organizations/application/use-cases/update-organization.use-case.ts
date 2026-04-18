import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { OrganizationsRepository } from "../repositories/organizations.repository";
import type { Organization } from "../../enterprise/entities/organization";
import type { OrganizationProps } from "../../enterprise/entities/organization";

export interface UpdateOrganizationInput {
  id: string;
  requesterId: string;
  requesterRole: string;
  name?: string;
  legalName?: string;
  foundationDate?: Date;
  website?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  country?: string;
  state?: string;
  city?: string;
  zipCode?: string;
  streetAddress?: string;
  industry?: string;
  employeeCount?: number;
  annualRevenue?: number;
  taxId?: string;
  description?: string;
  companyOwner?: string;
  companySize?: string;
  languages?: string;
  primaryCNAEId?: string;
  internationalActivity?: string;
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  twitter?: string;
  tiktok?: string;
  sourceLeadId?: string;
  externalProjectIds?: string;
  driveFolderId?: string;
  hasHosting?: boolean;
  hostingRenewalDate?: Date;
  hostingPlan?: string;
  hostingValue?: number;
  hostingReminderDays?: number;
  hostingNotes?: string;
  inOperationsAt?: Date;
}

type Output = Either<Error, { organization: Organization }>;

@Injectable()
export class UpdateOrganizationUseCase {
  constructor(private readonly organizations: OrganizationsRepository) {}

  async execute(input: UpdateOrganizationInput): Promise<Output> {
    const organization = await this.organizations.findByIdRaw(input.id);
    if (!organization) return left(new Error("Organização não encontrada"));

    if (input.requesterRole !== "admin" && organization.ownerId !== input.requesterId) {
      return left(new Error("Não autorizado"));
    }

    const { id, requesterId, requesterRole, ...fields } = input;

    organization.update(fields as Partial<Omit<OrganizationProps, "ownerId" | "createdAt" | "updatedAt">>);

    await this.organizations.save(organization);
    return right({ organization });
  }
}
