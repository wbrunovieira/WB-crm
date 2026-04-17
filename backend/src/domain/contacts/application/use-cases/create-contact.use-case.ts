import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { ContactsRepository } from "../repositories/contacts.repository";
import { Contact } from "../../enterprise/entities/contact";
import type { ContactStatus } from "../../enterprise/entities/contact";

export interface CreateContactInput {
  ownerId: string;
  name: string;
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
export class CreateContactUseCase {
  constructor(private readonly contacts: ContactsRepository) {}

  async execute(input: CreateContactInput): Promise<Output> {
    if (!input.name.trim()) return left(new Error("Nome é obrigatório"));

    const leadId = input.companyType === "lead" ? input.companyId : undefined;
    const organizationId = input.companyType === "organization" ? input.companyId : undefined;
    const partnerId = input.companyType === "partner" ? input.companyId : undefined;

    const contact = Contact.create({
      ownerId: input.ownerId,
      name: input.name.trim(),
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
      status: input.status ?? "active",
      isPrimary: input.isPrimary ?? false,
      birthDate: input.birthDate,
      notes: input.notes,
      preferredLanguage: input.preferredLanguage ?? "pt-BR",
      languages: input.languages,
      source: input.source,
      sourceLeadContactId: input.sourceLeadContactId,
    });

    await this.contacts.save(contact);
    return right({ contact });
  }
}
