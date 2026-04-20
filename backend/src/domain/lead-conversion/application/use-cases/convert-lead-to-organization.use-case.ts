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
      primaryCNAEId: lead.primaryCNAEId,
      internationalActivity: lead.internationalActivity,
      referredByPartnerId: lead.referredByPartnerId,
      sourceLeadId: lead.id.toString(),
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
