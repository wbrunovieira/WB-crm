import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { OrganizationsRepository } from "../repositories/organizations.repository";
import { Organization } from "../../enterprise/entities/organization";

export interface CreateOrganizationInput {
  ownerId: string;
  name: string;
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
export class CreateOrganizationUseCase {
  constructor(private readonly organizations: OrganizationsRepository) {}

  async execute(input: CreateOrganizationInput): Promise<Output> {
    if (!input.name?.trim()) {
      return left(new Error("Nome da organização é obrigatório"));
    }

    const organization = Organization.create({
      ownerId: input.ownerId,
      name: input.name.trim(),
      legalName: input.legalName,
      foundationDate: input.foundationDate,
      website: input.website,
      phone: input.phone,
      whatsapp: input.whatsapp,
      email: input.email,
      country: input.country,
      state: input.state,
      city: input.city,
      zipCode: input.zipCode,
      streetAddress: input.streetAddress,
      industry: input.industry,
      employeeCount: input.employeeCount,
      annualRevenue: input.annualRevenue,
      taxId: input.taxId,
      description: input.description,
      companyOwner: input.companyOwner,
      companySize: input.companySize,
      languages: input.languages,
      primaryCNAEId: input.primaryCNAEId,
      internationalActivity: input.internationalActivity,
      instagram: input.instagram,
      linkedin: input.linkedin,
      facebook: input.facebook,
      twitter: input.twitter,
      tiktok: input.tiktok,
      sourceLeadId: input.sourceLeadId,
      externalProjectIds: input.externalProjectIds,
      driveFolderId: input.driveFolderId,
      hasHosting: input.hasHosting ?? false,
      hostingRenewalDate: input.hostingRenewalDate,
      hostingPlan: input.hostingPlan,
      hostingValue: input.hostingValue,
      hostingReminderDays: input.hostingReminderDays ?? 30,
      hostingNotes: input.hostingNotes,
      inOperationsAt: input.inOperationsAt,
    });

    await this.organizations.save(organization);
    return right({ organization });
  }
}
