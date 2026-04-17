import type { Contact as PrismaContact } from "@prisma/client";
import { Contact } from "@/domain/contacts/enterprise/entities/contact";
import { UniqueEntityID } from "@/core/unique-entity-id";
import type { ContactStatus } from "@/domain/contacts/enterprise/entities/contact";

export class ContactMapper {
  static toDomain(raw: PrismaContact): Contact {
    return Contact.create(
      {
        ownerId: raw.ownerId,
        name: raw.name,
        email: raw.email ?? undefined,
        phone: raw.phone ?? undefined,
        whatsapp: raw.whatsapp ?? undefined,
        whatsappVerified: raw.whatsappVerified,
        role: raw.role ?? undefined,
        department: raw.department ?? undefined,
        leadId: raw.leadId ?? undefined,
        organizationId: raw.organizationId ?? undefined,
        partnerId: raw.partnerId ?? undefined,
        linkedin: raw.linkedin ?? undefined,
        instagram: raw.instagram ?? undefined,
        status: (raw.status ?? "active") as ContactStatus,
        isPrimary: raw.isPrimary,
        birthDate: raw.birthDate ?? undefined,
        notes: raw.notes ?? undefined,
        preferredLanguage: raw.preferredLanguage ?? "pt-BR",
        languages: raw.languages ?? undefined,
        source: raw.source ?? undefined,
        sourceLeadContactId: raw.sourceLeadContactId ?? undefined,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    );
  }

  static toPrisma(contact: Contact): PrismaContact {
    return {
      id: contact.id.toString(),
      ownerId: contact.ownerId,
      name: contact.name,
      email: contact.email ?? null,
      phone: contact.phone ?? null,
      whatsapp: contact.whatsapp ?? null,
      whatsappVerified: contact.whatsappVerified,
      whatsappVerifiedAt: null,
      whatsappVerifiedNumber: null,
      role: contact.role ?? null,
      department: contact.department ?? null,
      leadId: contact.leadId ?? null,
      organizationId: contact.organizationId ?? null,
      partnerId: contact.partnerId ?? null,
      linkedin: contact.linkedin ?? null,
      instagram: contact.instagram ?? null,
      status: contact.status,
      isPrimary: contact.isPrimary,
      birthDate: contact.birthDate ?? null,
      notes: contact.notes ?? null,
      preferredLanguage: contact.preferredLanguage,
      languages: contact.languages ?? null,
      source: contact.source ?? null,
      sourceLeadContactId: contact.sourceLeadContactId ?? null,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    } as PrismaContact;
  }
}
