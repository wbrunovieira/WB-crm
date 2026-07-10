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

    // Partial (PATCH) semantics: only touch fields the caller actually sent.
    // Passing `undefined` through would let Object.assign overwrite existing
    // values — so a partial update (e.g. from the partner contacts modal, which
    // omits companyType and the fields it doesn't manage) must NOT clear them or
    // detach the contact from its company.
    contact.update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.whatsapp !== undefined && { whatsapp: input.whatsapp }),
      ...(input.role !== undefined && { role: input.role }),
      ...(input.department !== undefined && { department: input.department }),
      ...(input.linkedin !== undefined && { linkedin: input.linkedin }),
      ...(input.instagram !== undefined && { instagram: input.instagram }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.isPrimary !== undefined && { isPrimary: input.isPrimary }),
      ...(input.birthDate !== undefined && { birthDate: input.birthDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.preferredLanguage !== undefined && { preferredLanguage: input.preferredLanguage }),
      ...(input.languages !== undefined && { languages: input.languages }),
      ...(input.source !== undefined && { source: input.source }),
      ...(input.sourceLeadContactId !== undefined && { sourceLeadContactId: input.sourceLeadContactId }),
      // Company link is only reassigned when companyType is provided; the other
      // two links are cleared (undefined → persisted as null by the mapper) so a
      // contact moves cleanly between a lead / organization / partner.
      ...(input.companyType !== undefined && {
        leadId: input.companyType === "lead" ? input.companyId : undefined,
        organizationId: input.companyType === "organization" ? input.companyId : undefined,
        partnerId: input.companyType === "partner" ? input.companyId : undefined,
      }),
    });

    await this.contacts.save(contact);
    return right({ contact });
  }
}
