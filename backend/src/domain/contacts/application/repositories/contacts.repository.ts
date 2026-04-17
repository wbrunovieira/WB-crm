import type { Contact } from "../../enterprise/entities/contact";

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
  abstract findById(id: string): Promise<Contact | null>;
  abstract findByIdWithAccess(id: string, requesterId: string, requesterRole: string): Promise<Contact | null>;
  abstract save(contact: Contact): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
