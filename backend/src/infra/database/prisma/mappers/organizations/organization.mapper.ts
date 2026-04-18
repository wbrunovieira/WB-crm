import type { Organization as PrismaOrganization } from "@prisma/client";
import { Organization } from "@/domain/organizations/enterprise/entities/organization";
import { UniqueEntityID } from "@/core/unique-entity-id";

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);
  return undefined;
}

function toJsonString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export class OrganizationMapper {
  static toDomain(raw: PrismaOrganization): Organization {
    return Organization.create(
      {
        ownerId: raw.ownerId,
        name: raw.name,
        legalName: raw.legalName ?? undefined,
        foundationDate: raw.foundationDate ?? undefined,
        website: raw.website ?? undefined,
        phone: raw.phone ?? undefined,
        whatsapp: raw.whatsapp ?? undefined,
        email: raw.email ?? undefined,
        country: raw.country ?? undefined,
        state: raw.state ?? undefined,
        city: raw.city ?? undefined,
        zipCode: raw.zipCode ?? undefined,
        streetAddress: raw.streetAddress ?? undefined,
        industry: raw.industry ?? undefined,
        employeeCount: raw.employeeCount ?? undefined,
        annualRevenue: raw.annualRevenue ?? undefined,
        taxId: raw.taxId ?? undefined,
        description: raw.description ?? undefined,
        companyOwner: raw.companyOwner ?? undefined,
        companySize: raw.companySize ?? undefined,
        languages: raw.languages ?? undefined,
        primaryCNAEId: raw.primaryCNAEId ?? undefined,
        internationalActivity: raw.internationalActivity ?? undefined,
        instagram: raw.instagram ?? undefined,
        linkedin: raw.linkedin ?? undefined,
        facebook: raw.facebook ?? undefined,
        twitter: raw.twitter ?? undefined,
        tiktok: raw.tiktok ?? undefined,
        sourceLeadId: raw.sourceLeadId ?? undefined,
        referredByPartnerId: raw.referredByPartnerId ?? undefined,
        externalProjectIds: raw.externalProjectIds ?? undefined,
        driveFolderId: raw.driveFolderId ?? undefined,
        hasHosting: raw.hasHosting,
        hostingRenewalDate: raw.hostingRenewalDate ?? undefined,
        hostingPlan: raw.hostingPlan ?? undefined,
        hostingValue: raw.hostingValue ?? undefined,
        hostingReminderDays: raw.hostingReminderDays,
        hostingNotes: raw.hostingNotes ?? undefined,
        inOperationsAt: raw.inOperationsAt ?? undefined,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    );
  }

  static toPrisma(organization: Organization): Omit<PrismaOrganization, never> {
    return {
      id: organization.id.toString(),
      ownerId: organization.ownerId,
      name: organization.name,
      legalName: organization.legalName ?? null,
      foundationDate: organization.foundationDate instanceof Date
        ? organization.foundationDate
        : organization.foundationDate
          ? new Date(organization.foundationDate as string)
          : null,
      website: organization.website ?? null,
      phone: organization.phone ?? null,
      whatsapp: organization.whatsapp ?? null,
      email: organization.email ?? null,
      country: organization.country ?? null,
      state: organization.state ?? null,
      city: organization.city ?? null,
      zipCode: organization.zipCode ?? null,
      streetAddress: organization.streetAddress ?? null,
      industry: organization.industry ?? null,
      employeeCount: organization.employeeCount ?? null,
      annualRevenue: organization.annualRevenue ?? null,
      taxId: organization.taxId ?? null,
      description: organization.description ?? null,
      companyOwner: organization.companyOwner ?? null,
      companySize: organization.companySize ?? null,
      languages: toJsonString(organization.languages),
      primaryCNAEId: organization.primaryCNAEId ?? null,
      internationalActivity: organization.internationalActivity ?? null,
      instagram: organization.instagram ?? null,
      linkedin: organization.linkedin ?? null,
      facebook: organization.facebook ?? null,
      twitter: organization.twitter ?? null,
      tiktok: organization.tiktok ?? null,
      sourceLeadId: organization.sourceLeadId ?? null,
      referredByPartnerId: organization.referredByPartnerId ?? null,
      externalProjectIds: toJsonString(organization.externalProjectIds),
      driveFolderId: organization.driveFolderId ?? null,
      hasHosting: organization.hasHosting,
      hostingRenewalDate: organization.hostingRenewalDate instanceof Date
        ? organization.hostingRenewalDate
        : organization.hostingRenewalDate
          ? new Date(organization.hostingRenewalDate as string)
          : null,
      hostingPlan: organization.hostingPlan ?? null,
      hostingValue: organization.hostingValue ?? null,
      hostingReminderDays: organization.hostingReminderDays,
      hostingNotes: organization.hostingNotes ?? null,
      inOperationsAt: organization.inOperationsAt instanceof Date
        ? organization.inOperationsAt
        : organization.inOperationsAt
          ? new Date(organization.inOperationsAt as string)
          : null,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    } as PrismaOrganization;
  }
}
