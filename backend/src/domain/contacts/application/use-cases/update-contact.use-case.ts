import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { ContactsRepository } from "../repositories/contacts.repository";
import type { Contact, ContactStatus } from "../../enterprise/entities/contact";

export interface UpdateContactInput {
  id: string;
  requesterId: string;
  requesterRole: string;
  name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  role?: string;
  department?: string;
  companyType?: "lead" | "organization" | "partner";
  companyId?: string;
  linkedin?: string;
  instagram?: string;
  status?: ContactStatus;
  isPrimary?: boolean;
  birthDate?: Date;
  notes?: string;
  preferredLanguage?: string;
  languages?: string;
  source?: string;
  sourceLeadContactId?: string;
}

type Output = Either<Error, { contact: Contact }>;

@Injectable()
export class UpdateContactUseCase {
  constructor(private readonly contacts: ContactsRepository) {}

  async execute(input: UpdateContactInput): Promise<Output> {
    const contact = await this.contacts.findByIdWithAccess(
      input.id,
      input.requesterId,
      input.requesterRole,
    );
    if (!contact) return left(new Error("Contato não encontrado"));

    if (input.requesterRole !== "admin" && contact.ownerId !== input.requesterId) {
      return left(new Error("Não autorizado"));
    }

    const leadId = input.companyType === "lead" ? input.companyId : undefined;
    const organizationId = input.companyType === "organization" ? input.companyId : undefined;
    const partnerId = input.companyType === "partner" ? input.companyId : undefined;

    contact.update({
      name: input.name ?? contact.name,
      email: input.email,
      phone: input.phone,
      whatsapp: input.whatsapp,
      role: input.role,
      department: input.department,
      leadId,
      organizationId,
      partnerId,
      linkedin: input.linkedin,
      instagram: input.instagram,
      status: input.status ?? contact.status,
      isPrimary: input.isPrimary ?? contact.isPrimary,
      birthDate: input.birthDate,
      notes: input.notes,
      preferredLanguage: input.preferredLanguage ?? contact.preferredLanguage,
      languages: input.languages,
      source: input.source,
      sourceLeadContactId: input.sourceLeadContactId,
    });

    await this.contacts.save(contact);
    return right({ contact });
  }
}
