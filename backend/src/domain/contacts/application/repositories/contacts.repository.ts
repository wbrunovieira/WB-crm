import type { Contact } from "../../enterprise/entities/contact";
import type { ContactSummary, ContactDetail } from "../../enterprise/read-models/contact-read-models";

export interface ContactFilters {
  search?: string;
  status?: string;
  company?: string;    // "lead" | "organization" | "partner" | "none"
  ownerIdFilter?: string; // admin only: "all" | "mine" | userId
}

export interface ContactsQueryParams {
  filters: ContactFilters;
  requesterId: string;
  requesterRole: string;
}

export abstract class ContactsRepository {
  abstract findMany(params: ContactsQueryParams): Promise<Contact[]>;
  abstract findManyWithRelations(params: ContactsQueryParams): Promise<ContactSummary[]>;
  abstract findById(id: string): Promise<Contact | null>;
  abstract findByIdWithAccess(id: string, requesterId: string, requesterRole: string): Promise<Contact | null>;
  abstract findByIdWithRelations(id: string, requesterId: string, requesterRole: string): Promise<ContactDetail | null>;
  abstract save(contact: Contact): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
