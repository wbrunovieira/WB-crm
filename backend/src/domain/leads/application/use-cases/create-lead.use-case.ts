import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { LeadsRepository, type LeadContactInput } from "../repositories/leads.repository";
import { Lead } from "../../enterprise/entities/lead";
import { BusinessName } from "../../enterprise/value-objects/business-name.vo";
import { normalizePhoneE164 } from "@/infra/shared/phone/phone-normalizer";

export interface CreateLeadInput {
  ownerId: string;
  businessName: string;
  registeredName?: string;
  foundationDate?: Date;
  companyRegistrationID?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  vicinity?: string;
  phone?: string;
  phone2?: string;
  whatsapp?: string;
  whatsappVerified?: boolean;
  whatsappVerifiedAt?: Date;
  whatsappVerifiedNumber?: string;
  website?: string;
  email?: string;
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  twitter?: string;
  tiktok?: string;
  googleId?: string;
  categories?: string;
  rating?: number;
  priceLevel?: number;
  userRatingsTotal?: number;
  permanentlyClosed?: boolean;
  types?: string;
  companyOwner?: string;
  companySize?: string;
  revenue?: number;
  employeesCount?: number;
  description?: string;
  equityCapital?: number;
  businessStatus?: string;
  languages?: string;
  primaryActivity?: string;
  secondaryActivities?: string;
  primaryCNAEId?: string;
  internationalActivity?: string;
  source?: string;
  segment?: string;
  legalNature?: string;
  branchType?: string;
  simplesNacional?: boolean;
  isMei?: boolean;
  revenueRange?: string;
  quality?: string;
  searchTerm?: string;
  fieldsFilled?: number;
  category?: string;
  radius?: number;
  socialMedia?: string;
  metaAds?: string;
  googleAds?: string;
  starRating?: number;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
  openingHours?: string;
  googlePlacesSearchId?: string;
  status?: string;
  isArchived?: boolean;
  isProspect?: boolean;
  referredByPartnerId?: string;
  activityOrder?: string;
  driveFolderId?: string;
  inOperationsAt?: Date;
  sourceGroup?: string;
  // Relations
  labelIds?: string[];
  icpId?: string;
  contacts?: LeadContactInput[];
}

type Output = Either<Error, { lead: Lead }>;

@Injectable()
export class CreateLeadUseCase {
  constructor(private readonly leads: LeadsRepository) {}

  async execute(input: CreateLeadInput): Promise<Output> {
    const businessNameResult = BusinessName.create(input.businessName);
    if (businessNameResult.isLeft()) return left(businessNameResult.value);

    const lead = Lead.create({
      ownerId: input.ownerId,
      businessName: businessNameResult.value.value,
      registeredName: input.registeredName,
      foundationDate: input.foundationDate,
      companyRegistrationID: input.companyRegistrationID,
      address: input.address,
      city: input.city,
      state: input.state,
      country: input.country,
      zipCode: input.zipCode,
      vicinity: input.vicinity,
      phone: normalizePhoneE164(input.phone) ?? undefined,
      phone2: normalizePhoneE164(input.phone2) ?? undefined,
      whatsapp: normalizePhoneE164(input.whatsapp) ?? undefined,
      whatsappVerified: input.whatsappVerified ?? false,
      whatsappVerifiedAt: input.whatsappVerifiedAt,
      whatsappVerifiedNumber: input.whatsappVerifiedNumber,
      website: input.website,
      email: input.email,
      instagram: input.instagram,
      linkedin: input.linkedin,
      facebook: input.facebook,
      twitter: input.twitter,
      tiktok: input.tiktok,
      googleId: input.googleId,
      categories: input.categories,
      rating: input.rating,
      priceLevel: input.priceLevel,
      userRatingsTotal: input.userRatingsTotal,
      permanentlyClosed: input.permanentlyClosed ?? false,
      types: input.types,
      companyOwner: input.companyOwner,
      companySize: input.companySize,
      revenue: input.revenue,
      employeesCount: input.employeesCount,
      description: input.description,
      equityCapital: input.equityCapital,
      businessStatus: input.businessStatus,
      languages: input.languages,
      primaryActivity: input.primaryActivity,
      secondaryActivities: input.secondaryActivities,
      primaryCNAEId: input.primaryCNAEId,
      internationalActivity: input.internationalActivity,
      source: input.source,
      segment: input.segment,
      legalNature: input.legalNature,
      branchType: input.branchType,
      simplesNacional: input.simplesNacional,
      isMei: input.isMei,
      revenueRange: input.revenueRange,
      quality: input.quality,
      searchTerm: input.searchTerm,
      fieldsFilled: input.fieldsFilled,
      category: input.category,
      radius: input.radius,
      socialMedia: input.socialMedia,
      metaAds: input.metaAds,
      googleAds: input.googleAds,
      starRating: input.starRating,
      latitude: input.latitude,
      longitude: input.longitude,
      googleMapsUrl: input.googleMapsUrl,
      openingHours: input.openingHours,
      googlePlacesSearchId: input.googlePlacesSearchId,
      status: input.status ?? "new",
      isArchived: input.isArchived ?? false,
      isProspect: input.isProspect ?? false,
      referredByPartnerId: input.referredByPartnerId,
      activityOrder: input.activityOrder,
      driveFolderId: input.driveFolderId,
      inOperationsAt: input.inOperationsAt,
      sourceGroup: input.sourceGroup,
    });

    const hasRelations = input.labelIds !== undefined || input.icpId !== undefined || (input.contacts && input.contacts.length > 0);

    if (hasRelations) {
      await this.leads.saveWithRelations(lead, {
        labelIds: input.labelIds,
        icpId: input.icpId ?? null,
        contacts: input.contacts,
      });
    } else {
      await this.leads.save(lead);
    }

    return right({ lead });
  }
}
