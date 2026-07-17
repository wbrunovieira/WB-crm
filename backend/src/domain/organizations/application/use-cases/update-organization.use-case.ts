import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { OrganizationsRepository } from "../repositories/organizations.repository";
import type { Organization } from "../../enterprise/entities/organization";
import type { OrganizationProps } from "../../enterprise/entities/organization";
import { normalizePhoneE164 } from "@/infra/shared/phone/phone-normalizer";
import { CommLanguage } from "@/core/value-objects/comm-language";

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
  commLanguage?: string;
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
  segment?: string;
  legalNature?: string;
  branchType?: string;
  simplesNacional?: boolean;
  isMei?: boolean;
  revenueRange?: string;
  phone2?: string;
  sourceGroup?: string;
  labelIds?: string[];
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

    if (input.commLanguage !== undefined) {
      const langR = CommLanguage.create(input.commLanguage);
      if (langR.isLeft()) return left(langR.value);
      input.commLanguage = langR.value.value;
    }

    const { id, requesterId, requesterRole, labelIds, ...fields } = input;

    if (fields.phone !== undefined) fields.phone = normalizePhoneE164(fields.phone) ?? undefined;
    if (fields.phone2 !== undefined) fields.phone2 = normalizePhoneE164(fields.phone2) ?? undefined;
    if (fields.whatsapp !== undefined) fields.whatsapp = normalizePhoneE164(fields.whatsapp) ?? undefined;

    organization.update(fields as Partial<Omit<OrganizationProps, "ownerId" | "createdAt" | "updatedAt">>);

    if (labelIds !== undefined) {
      await this.organizations.saveWithLabels(organization, labelIds);
    } else {
      await this.organizations.save(organization);
    }
    return right({ organization });
  }
}
