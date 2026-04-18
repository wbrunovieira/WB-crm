import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { LeadsRepository } from "../repositories/leads.repository";
import { Lead } from "../../enterprise/entities/lead";

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
}

type Output = Either<Error, { lead: Lead }>;

@Injectable()
export class CreateLeadUseCase {
  constructor(private readonly leads: LeadsRepository) {}

  async execute(input: CreateLeadInput): Promise<Output> {
    if (!input.businessName?.trim()) {
      return left(new Error("Nome da empresa é obrigatório"));
    }

    const lead = Lead.create({
      ownerId: input.ownerId,
      businessName: input.businessName.trim(),
      registeredName: input.registeredName,
      foundationDate: input.foundationDate,
      companyRegistrationID: input.companyRegistrationID,
      address: input.address,
      city: input.city,
      state: input.state,
      country: input.country,
      zipCode: input.zipCode,
      vicinity: input.vicinity,
      phone: input.phone,
      whatsapp: input.whatsapp,
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
    });

    await this.leads.save(lead);
    return right({ lead });
  }
}
