import type { Lead as PrismaLead } from "@prisma/client";
import { Lead } from "@/domain/leads/enterprise/entities/lead";
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

export class LeadMapper {
  static toDomain(raw: PrismaLead): Lead {
    return Lead.create(
      {
        ownerId: raw.ownerId,
        businessName: raw.businessName,
        registeredName: raw.registeredName ?? undefined,
        foundationDate: raw.foundationDate ?? undefined,
        companyRegistrationID: raw.companyRegistrationID ?? undefined,
        address: raw.address ?? undefined,
        city: raw.city ?? undefined,
        state: raw.state ?? undefined,
        country: raw.country ?? undefined,
        zipCode: raw.zipCode ?? undefined,
        vicinity: raw.vicinity ?? undefined,
        phone: raw.phone ?? undefined,
        whatsapp: raw.whatsapp ?? undefined,
        whatsappVerified: raw.whatsappVerified,
        whatsappVerifiedAt: raw.whatsappVerifiedAt ?? undefined,
        whatsappVerifiedNumber: raw.whatsappVerifiedNumber ?? undefined,
        website: raw.website ?? undefined,
        email: raw.email ?? undefined,
        instagram: raw.instagram ?? undefined,
        linkedin: raw.linkedin ?? undefined,
        facebook: raw.facebook ?? undefined,
        twitter: raw.twitter ?? undefined,
        tiktok: raw.tiktok ?? undefined,
        googleId: raw.googleId ?? undefined,
        categories: raw.categories ?? undefined,
        rating: raw.rating ?? undefined,
        priceLevel: raw.priceLevel ?? undefined,
        userRatingsTotal: raw.userRatingsTotal ?? undefined,
        permanentlyClosed: raw.permanentlyClosed,
        types: raw.types ?? undefined,
        companyOwner: raw.companyOwner ?? undefined,
        companySize: raw.companySize ?? undefined,
        revenue: raw.revenue ?? undefined,
        employeesCount: raw.employeesCount ?? undefined,
        description: raw.description ?? undefined,
        equityCapital: raw.equityCapital ?? undefined,
        businessStatus: raw.businessStatus ?? undefined,
        languages: raw.languages ?? undefined,
        primaryActivity: raw.primaryActivity ?? undefined,
        secondaryActivities: raw.secondaryActivities ?? undefined,
        primaryCNAEId: raw.primaryCNAEId ?? undefined,
        internationalActivity: raw.internationalActivity ?? undefined,
        source: raw.source ?? undefined,
        quality: raw.quality ?? undefined,
        searchTerm: raw.searchTerm ?? undefined,
        fieldsFilled: raw.fieldsFilled ?? undefined,
        category: raw.category ?? undefined,
        radius: raw.radius ?? undefined,
        socialMedia: raw.socialMedia ?? undefined,
        metaAds: raw.metaAds ?? undefined,
        googleAds: raw.googleAds ?? undefined,
        starRating: raw.starRating ?? undefined,
        latitude: raw.latitude ?? undefined,
        longitude: raw.longitude ?? undefined,
        googleMapsUrl: raw.googleMapsUrl ?? undefined,
        openingHours: raw.openingHours ?? undefined,
        googlePlacesSearchId: raw.googlePlacesSearchId ?? undefined,
        status: raw.status,
        isArchived: raw.isArchived,
        archivedAt: raw.archivedAt ?? undefined,
        archivedReason: raw.archivedReason ?? undefined,
        isProspect: raw.isProspect,
        convertedAt: raw.convertedAt ?? undefined,
        convertedToOrganizationId: raw.convertedToOrganizationId ?? undefined,
        referredByPartnerId: raw.referredByPartnerId ?? undefined,
        activityOrder: raw.activityOrder ?? undefined,
        driveFolderId: raw.driveFolderId ?? undefined,
        inOperationsAt: raw.inOperationsAt ?? undefined,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    );
  }

  static toPrisma(lead: Lead): Omit<PrismaLead, never> {
    return {
      id: lead.id.toString(),
      ownerId: lead.ownerId,
      businessName: lead.businessName,
      registeredName: lead.registeredName ?? null,
      foundationDate: lead.foundationDate instanceof Date
        ? lead.foundationDate
        : lead.foundationDate
          ? new Date(lead.foundationDate as string)
          : null,
      companyRegistrationID: lead.companyRegistrationID ?? null,
      address: lead.address ?? null,
      city: lead.city ?? null,
      state: lead.state ?? null,
      country: lead.country ?? null,
      zipCode: lead.zipCode ?? null,
      vicinity: lead.vicinity ?? null,
      phone: lead.phone ?? null,
      whatsapp: lead.whatsapp ?? null,
      whatsappVerified: lead.whatsappVerified,
      whatsappVerifiedAt: lead.whatsappVerifiedAt instanceof Date
        ? lead.whatsappVerifiedAt
        : lead.whatsappVerifiedAt
          ? new Date(lead.whatsappVerifiedAt as string)
          : null,
      whatsappVerifiedNumber: lead.whatsappVerifiedNumber ?? null,
      website: lead.website ?? null,
      email: lead.email ?? null,
      instagram: lead.instagram ?? null,
      linkedin: lead.linkedin ?? null,
      facebook: lead.facebook ?? null,
      twitter: lead.twitter ?? null,
      tiktok: lead.tiktok ?? null,
      googleId: lead.googleId ?? null,
      categories: toJsonString(lead.categories),
      rating: lead.rating ?? null,
      priceLevel: lead.priceLevel ?? null,
      userRatingsTotal: lead.userRatingsTotal ?? null,
      permanentlyClosed: lead.permanentlyClosed,
      types: toJsonString(lead.types),
      companyOwner: lead.companyOwner ?? null,
      companySize: lead.companySize ?? null,
      revenue: lead.revenue ?? null,
      employeesCount: lead.employeesCount ?? null,
      description: lead.description ?? null,
      equityCapital: lead.equityCapital ?? null,
      businessStatus: lead.businessStatus ?? null,
      languages: toJsonString(lead.languages),
      primaryActivity: lead.primaryActivity ?? null,
      secondaryActivities: lead.secondaryActivities ?? null,
      primaryCNAEId: lead.primaryCNAEId ?? null,
      internationalActivity: lead.internationalActivity ?? null,
      source: lead.source ?? null,
      quality: lead.quality ?? null,
      searchTerm: lead.searchTerm ?? null,
      fieldsFilled: lead.fieldsFilled ?? null,
      category: lead.category ?? null,
      radius: lead.radius ?? null,
      socialMedia: lead.socialMedia ?? null,
      metaAds: lead.metaAds ?? null,
      googleAds: lead.googleAds ?? null,
      starRating: lead.starRating ?? null,
      latitude: lead.latitude ?? null,
      longitude: lead.longitude ?? null,
      googleMapsUrl: lead.googleMapsUrl ?? null,
      openingHours: toJsonString(lead.openingHours),
      googlePlacesSearchId: lead.googlePlacesSearchId ?? null,
      status: lead.status,
      isArchived: lead.isArchived,
      archivedAt: lead.archivedAt instanceof Date
        ? lead.archivedAt
        : lead.archivedAt
          ? new Date(lead.archivedAt as string)
          : null,
      archivedReason: lead.archivedReason ?? null,
      isProspect: lead.isProspect,
      convertedAt: lead.convertedAt instanceof Date
        ? lead.convertedAt
        : lead.convertedAt
          ? new Date(lead.convertedAt as string)
          : null,
      convertedToOrganizationId: lead.convertedToOrganizationId ?? null,
      referredByPartnerId: lead.referredByPartnerId ?? null,
      activityOrder: toJsonString(lead.activityOrder),
      driveFolderId: lead.driveFolderId ?? null,
      inOperationsAt: lead.inOperationsAt instanceof Date
        ? lead.inOperationsAt
        : lead.inOperationsAt
          ? new Date(lead.inOperationsAt as string)
          : null,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    } as PrismaLead;
  }
}
