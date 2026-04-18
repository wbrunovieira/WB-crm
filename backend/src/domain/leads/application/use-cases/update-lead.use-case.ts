import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { LeadsRepository } from "../repositories/leads.repository";
import type { Lead } from "../../enterprise/entities/lead";
import type { LeadProps } from "../../enterprise/entities/lead";

export interface UpdateLeadInput {
  id: string;
  requesterId: string;
  requesterRole: string;
  businessName?: string;
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
  // Relations
  labelIds?: string[];
  icpId?: string | null; // null = remove ICP
}

type Output = Either<Error, { lead: Lead }>;

@Injectable()
export class UpdateLeadUseCase {
  constructor(private readonly leads: LeadsRepository) {}

  async execute(input: UpdateLeadInput): Promise<Output> {
    const lead = await this.leads.findByIdRaw(input.id);
    if (!lead) return left(new Error("Lead não encontrado"));

    if (input.requesterRole !== "admin" && lead.ownerId !== input.requesterId) {
      return left(new Error("Não autorizado"));
    }

    const { id, requesterId, requesterRole, labelIds, icpId, ...fields } = input;

    lead.update(fields as Partial<Omit<LeadProps, "ownerId" | "createdAt" | "updatedAt">>);

    const hasRelations = labelIds !== undefined || icpId !== undefined;

    if (hasRelations) {
      await this.leads.saveWithRelations(lead, { labelIds, icpId });
    } else {
      await this.leads.save(lead);
    }

    return right({ lead });
  }
}
