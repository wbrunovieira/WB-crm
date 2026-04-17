import { ContactsRepository, type ContactFilters, type ContactsQueryParams } from "@/domain/contacts/application/repositories/contacts.repository";
import type { Contact } from "@/domain/contacts/enterprise/entities/contact";
import type { ContactSummary, ContactDetail, ContactActivity } from "@/domain/contacts/enterprise/read-models/contact-read-models";

export class InMemoryContactsRepository extends ContactsRepository {
  public items: Contact[] = [];

  // Lookup maps for relations
  public organizationsMap: Map<string, { id: string; name: string }> = new Map();
  public leadsMap: Map<string, { id: string; businessName: string }> = new Map();
  public partnersMap: Map<string, { id: string; name: string }> = new Map();
  public ownersMap: Map<string, { id: string; name: string; email: string }> = new Map();
  // keyed by contactId
  public dealsMap: Map<string, Array<{ id: string; title: string; contactId: string; stage: { name: string } }>> = new Map();
  // keyed by contactId
  public activitiesMap: Map<string, ContactActivity[]> = new Map();

  private applyFilters(items: Contact[], { filters, requesterId, requesterRole }: ContactsQueryParams): Contact[] {
    let results = items;

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

  private toSummary(c: Contact): ContactSummary {
    const organization = c.organizationId ? (this.organizationsMap.get(c.organizationId) ?? null) : null;
    const lead = c.leadId ? (this.leadsMap.get(c.leadId) ?? null) : null;
    const partner = c.partnerId ? (this.partnersMap.get(c.partnerId) ?? null) : null;
    const ownerFull = this.ownersMap.get(c.ownerId);
    const owner = ownerFull ? { id: ownerFull.id, name: ownerFull.name } : null;

    return {
      id: c.id.toString(),
      ownerId: c.ownerId,
      name: c.name,
      email: c.email ?? null,
      phone: c.phone ?? null,
      whatsapp: c.whatsapp ?? null,
      role: c.role ?? null,
      department: c.department ?? null,
      isPrimary: c.isPrimary,
      status: c.status,
      organization,
      lead,
      partner,
      owner,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  async findMany({ filters, requesterId, requesterRole }: ContactsQueryParams): Promise<Contact[]> {
    const results = this.applyFilters(this.items, { filters, requesterId, requesterRole });
    return results;
  }

  async findManyWithRelations(params: ContactsQueryParams): Promise<ContactSummary[]> {
    const results = this.applyFilters(this.items, params);
    return results.map((c) => this.toSummary(c));
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

  async findByIdWithRelations(id: string, requesterId: string, requesterRole: string): Promise<ContactDetail | null> {
    const contact = await this.findById(id);
    if (!contact) return null;
    if (requesterRole !== "admin" && contact.ownerId !== requesterId) return null;

    const summary = this.toSummary(contact);
    const ownerFull = this.ownersMap.get(contact.ownerId);
    const owner = ownerFull ? { id: ownerFull.id, name: ownerFull.name, email: ownerFull.email } : null;

    const deals = (this.dealsMap.get(id) ?? []).map((d) => ({
      id: d.id,
      title: d.title,
      stage: d.stage,
    }));
    const activities = this.activitiesMap.get(id) ?? [];

    return {
      ...summary,
      owner,
      whatsappVerified: contact.whatsappVerified,
      whatsappVerifiedAt: null,
      whatsappVerifiedNumber: null,
      linkedin: contact.linkedin ?? null,
      instagram: contact.instagram ?? null,
      birthDate: contact.birthDate ?? null,
      notes: contact.notes ?? null,
      preferredLanguage: contact.preferredLanguage ?? null,
      languages: contact.languages ?? null,
      source: contact.source ?? null,
      leadId: contact.leadId ?? null,
      organizationId: contact.organizationId ?? null,
      partnerId: contact.partnerId ?? null,
      deals,
      activities,
    };
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
