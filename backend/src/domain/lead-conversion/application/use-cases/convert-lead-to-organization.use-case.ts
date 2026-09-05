import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { Organization } from "@/domain/organizations/enterprise/entities/organization";
import { Contact } from "@/domain/contacts/enterprise/entities/contact";
import { LeadConversionRepository, ConversionResult } from "../repositories/lead-conversion.repository";

export class LeadNotFoundError extends Error { name = "LeadNotFoundError"; }
export class LeadAlreadyConvertedError extends Error { name = "LeadAlreadyConvertedError"; }
export class LeadForbiddenError extends Error { name = "LeadForbiddenError"; }

export interface ConvertLeadInput {
  leadId: string;
  requesterId: string;
  requesterRole: string;
}

@Injectable()
export class ConvertLeadToOrganizationUseCase {
  constructor(private readonly repo: LeadConversionRepository) {}

  async execute(input: ConvertLeadInput): Promise<Either<LeadNotFoundError | LeadAlreadyConvertedError | LeadForbiddenError, ConversionResult>> {
    const data = await this.repo.findLeadWithContacts(input.leadId);
    if (!data) return left(new LeadNotFoundError("Lead não encontrado"));

    const { lead, contacts, secondaryCNAEIds, techProfile } = data;

    // Access control
    if (input.requesterRole !== "admin" && lead.ownerId !== input.requesterId) {
      return left(new LeadForbiddenError("Acesso negado ao Lead"));
    }

    // Guard: already converted
    if (lead.convertedToOrganizationId) {
      return left(new LeadAlreadyConvertedError("Lead já foi convertido em organização"));
    }

    // Build Organization from Lead data
    const now = new Date();
    const organization = Organization.create({
      ownerId: lead.ownerId,
      name: lead.businessName,
      legalName: lead.registeredName,
      foundationDate: lead.foundationDate,
      website: lead.website,
      phone: lead.phone,
      whatsapp: lead.whatsapp,
      email: lead.email,
      country: lead.country,
      state: lead.state,
      city: lead.city,
      zipCode: lead.zipCode,
      streetAddress: lead.address,
      taxId: lead.companyRegistrationID,
      description: lead.description,
      companyOwner: lead.companyOwner,
      companySize: lead.companySize,
      annualRevenue: lead.revenue,
      instagram: lead.instagram,
      linkedin: lead.linkedin,
      facebook: lead.facebook,
      twitter: lead.twitter,
      tiktok: lead.tiktok,
      languages: lead.languages,
      commLanguage: lead.commLanguage,
      primaryCNAEId: lead.primaryCNAEId,
      internationalActivity: lead.internationalActivity,
      referredByPartnerId: lead.referredByPartnerId,
      // Campos cadastrais/fiscais que a Organization já tem coluna para guardar. Ficavam de
      // fora da cópia, então evaporavam na conversão — sem erro, sem aviso. Note a troca de
      // nome: no Lead é `employeesCount`, na Organization é `employeeCount`.
      employeeCount: lead.employeesCount,
      segment: lead.segment,
      legalNature: lead.legalNature,
      branchType: lead.branchType,
      simplesNacional: lead.simplesNacional,
      isMei: lead.isMei,
      revenueRange: lead.revenueRange,
      phone2: lead.phone2,
      sourceGroup: lead.sourceGroup,
      // Paridade total com o lead: GPS da captura, Google Places, verificações de contato e
      // pesquisa do agente. `status` fica de fora — o do lead vira "qualified" na conversão
      // e não descreve um cliente.
      activityOrder: lead.activityOrder,
      agentResearchAt: lead.agentResearchAt,
      agentSummary: lead.agentSummary,
      agentUpdatedFields: lead.agentUpdatedFields,
      businessStatus: lead.businessStatus,
      categories: lead.categories,
      category: lead.category,
      emailVerificationReason: lead.emailVerificationReason,
      emailVerificationStatus: lead.emailVerificationStatus,
      emailVerified: lead.emailVerified,
      emailVerifiedAt: lead.emailVerifiedAt,
      equityCapital: lead.equityCapital,
      fieldsFilled: lead.fieldsFilled,
      googleAds: lead.googleAds,
      googleId: lead.googleId,
      googleMapsUrl: lead.googleMapsUrl,
      isProspect: lead.isProspect,
      latitude: lead.latitude,
      longitude: lead.longitude,
      metaAds: lead.metaAds,
      notes: lead.notes ?? undefined,
      openingHours: lead.openingHours,
      permanentlyClosed: lead.permanentlyClosed,
      phone2Type: lead.phone2Type,
      phone2Valid: lead.phone2Valid,
      phoneType: lead.phoneType,
      phoneValid: lead.phoneValid,
      priceLevel: lead.priceLevel,
      quality: lead.quality,
      radius: lead.radius,
      rating: lead.rating,
      searchTerm: lead.searchTerm,
      socialMedia: lead.socialMedia,
      source: lead.source,
      starRating: lead.starRating,
      types: lead.types,
      userRatingsTotal: lead.userRatingsTotal,
      vicinity: lead.vicinity,
      whatsappPhoneType: lead.whatsappPhoneType,
      whatsappPhoneValid: lead.whatsappPhoneValid,
      whatsappVerified: lead.whatsappVerified,
      whatsappVerifiedAt: lead.whatsappVerifiedAt,
      whatsappVerifiedNumber: lead.whatsappVerifiedNumber,
      sourceLeadId: lead.id.toString(),
      // "cliente desde": the moment it stopped being a lead.
      convertedAt: now,
      hasHosting: false,
      hostingReminderDays: 30,
      createdAt: now,
      updatedAt: now,
    });

    // Build Contacts from LeadContacts
    const contactPairs = contacts.filter((lc) => lc.isActive).map((lc) => {
      const contact = Contact.create({
        ownerId: lead.ownerId,
        name: lc.name,
        email: lc.email ?? undefined,
        phone: lc.phone ?? undefined,
        whatsapp: lc.whatsapp ?? undefined,
        role: lc.role ?? undefined,
        linkedin: lc.linkedin ?? undefined,
        instagram: lc.instagram ?? undefined,
        organizationId: organization.id.toString(),
        isPrimary: lc.isPrimary,
        status: "active",
        whatsappVerified: false,
        preferredLanguage: "pt-BR",
        languages: lc.languages ?? undefined,
        commLanguage: lc.commLanguage ?? undefined,
        sourceLeadContactId: lc.id,
        createdAt: now,
        updatedAt: now,
      }, new UniqueEntityID());

      return { contact, sourceLeadContactId: lc.id };
    });

    // Mark lead as converted (entity controls its own state transition)
    lead.markAsConverted(organization.id.toString());

    const result = await this.repo.execute({
      lead,
      organization,
      contacts: contactPairs,
      secondaryCNAEIds,
      techProfile,
    });

    return right(result);
  }
}
