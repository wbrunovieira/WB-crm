import type { Partner as PrismaPartner } from "@prisma/client";
import { Partner } from "@/domain/partners/enterprise/entities/partner";
import { UniqueEntityID } from "@/core/unique-entity-id";

export class PartnerMapper {
  static toDomain(raw: PrismaPartner): Partner {
    return Partner.create(
      {
        ownerId: raw.ownerId,
        name: raw.name,
        legalName: raw.legalName ?? undefined,
        foundationDate: raw.foundationDate ?? undefined,
        partnerType: raw.partnerType,
        website: raw.website ?? undefined,
        email: raw.email ?? undefined,
        phone: raw.phone ?? undefined,
        whatsapp: raw.whatsapp ?? undefined,
        country: raw.country ?? undefined,
        state: raw.state ?? undefined,
        city: raw.city ?? undefined,
        zipCode: raw.zipCode ?? undefined,
        streetAddress: raw.streetAddress ?? undefined,
        linkedin: raw.linkedin ?? undefined,
        instagram: raw.instagram ?? undefined,
        facebook: raw.facebook ?? undefined,
        twitter: raw.twitter ?? undefined,
        industry: raw.industry ?? undefined,
        employeeCount: raw.employeeCount ?? undefined,
        companySize: raw.companySize ?? undefined,
        description: raw.description ?? undefined,
        expertise: raw.expertise ?? undefined,
        notes: raw.notes ?? undefined,
        lastContactDate: raw.lastContactDate ?? undefined,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    );
  }

  static toPrisma(partner: Partner): Omit<PrismaPartner, never> {
    return {
      id: partner.id.toString(),
      ownerId: partner.ownerId,
      name: partner.name,
      legalName: partner.legalName ?? null,
      foundationDate: partner.foundationDate instanceof Date
        ? partner.foundationDate
        : partner.foundationDate ? new Date(partner.foundationDate as string) : null,
      partnerType: partner.partnerType,
      website: partner.website ?? null,
      email: partner.email ?? null,
      phone: partner.phone ?? null,
      whatsapp: partner.whatsapp ?? null,
      country: partner.country ?? null,
      state: partner.state ?? null,
      city: partner.city ?? null,
      zipCode: partner.zipCode ?? null,
      streetAddress: partner.streetAddress ?? null,
      linkedin: partner.linkedin ?? null,
      instagram: partner.instagram ?? null,
      facebook: partner.facebook ?? null,
      twitter: partner.twitter ?? null,
      industry: partner.industry ?? null,
      employeeCount: partner.employeeCount ?? null,
      companySize: partner.companySize ?? null,
      description: partner.description ?? null,
      expertise: partner.expertise ?? null,
      notes: partner.notes ?? null,
      lastContactDate: partner.lastContactDate instanceof Date
        ? partner.lastContactDate
        : partner.lastContactDate ? new Date(partner.lastContactDate as string) : null,
      createdAt: partner.createdAt,
      updatedAt: partner.updatedAt,
    } as PrismaPartner;
  }
}
