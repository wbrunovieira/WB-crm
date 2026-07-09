import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { LeadsRepository } from "../repositories/leads.repository";
import type { Lead } from "../../enterprise/entities/lead";
import type { LeadProps } from "../../enterprise/entities/lead";
import { normalizePhoneE164 } from "@/infra/shared/phone/phone-normalizer";
import { Cnpj } from "../../enterprise/value-objects/cnpj.vo";

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
  notes?: string | null;
  parentLeadId?: string | null;
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

    if (fields.phone !== undefined) fields.phone = normalizePhoneE164(fields.phone) ?? undefined;
    if (fields.phone2 !== undefined) fields.phone2 = normalizePhoneE164(fields.phone2) ?? undefined;
    if (fields.whatsapp !== undefined) fields.whatsapp = normalizePhoneE164(fields.whatsapp) ?? undefined;

    // CNPJ: valida o dígito (numérico ou alfanumérico) e normaliza quando informado.
    if (fields.companyRegistrationID && fields.companyRegistrationID.trim()) {
      const cnpjResult = Cnpj.create(fields.companyRegistrationID);
      if (cnpjResult.isLeft()) return left(cnpjResult.value);
      fields.companyRegistrationID = cnpjResult.value.value;
    }

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
