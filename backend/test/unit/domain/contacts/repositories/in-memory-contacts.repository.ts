import { ContactsRepository, type ContactFilters, type ContactsQueryParams } from "@/domain/contacts/application/repositories/contacts.repository";
import type { Contact } from "@/domain/contacts/enterprise/entities/contact";

export class InMemoryContactsRepository extends ContactsRepository {
  public items: Contact[] = [];

  async findMany({ filters, requesterId, requesterRole }: ContactsQueryParams): Promise<Contact[]> {
    let results = this.items;

    // Owner scoping
    if (requesterRole !== "admin") {
      results = results.filter(
        (c) => c.ownerId === requesterId,
      );
    } else if (filters.ownerIdFilter && filters.ownerIdFilter !== "all") {
      const targetId = filters.ownerIdFilter === "mine" ? requesterId : filters.ownerIdFilter;
      results = results.filter((c) => c.ownerId === targetId);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.includes(q),
      );
    }

    if (filters.status) {
      results = results.filter((c) => c.status === filters.status);
    }

    if (filters.company) {
      if (filters.company === "organization") results = results.filter((c) => c.organizationId);
      else if (filters.company === "lead")    results = results.filter((c) => c.leadId);
      else if (filters.company === "partner") results = results.filter((c) => c.partnerId);
      else if (filters.company === "none")    results = results.filter((c) => !c.organizationId && !c.leadId && !c.partnerId);
    }

    return results.sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  async findById(id: string): Promise<Contact | null> {
    return this.items.find((c) => c.id.toString() === id) ?? null;
  }

  async findByIdWithAccess(id: string, requesterId: string, requesterRole: string): Promise<Contact | null> {
    const contact = await this.findById(id);
    if (!contact) return null;
    if (requesterRole === "admin") return contact;
    if (contact.ownerId === requesterId) return contact;
    return null;
  }

  async save(contact: Contact): Promise<void> {
    const idx = this.items.findIndex((c) => c.id.equals(contact.id));
    if (idx >= 0) this.items[idx] = contact;
    else this.items.push(contact);
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((c) => c.id.toString() !== id);
  }
}
