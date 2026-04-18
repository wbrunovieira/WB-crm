import { LeadsRepository, type LeadFilters, type LeadRelations } from "@/domain/leads/application/repositories/leads.repository";
import type { Lead } from "@/domain/leads/enterprise/entities/lead";
import type { LeadSummary, LeadDetail } from "@/domain/leads/enterprise/read-models/lead-read-models";

export class InMemoryLeadsRepository extends LeadsRepository {
  public items: Lead[] = [];

  async findMany(requesterId: string, requesterRole: string, filters: LeadFilters = {}): Promise<LeadSummary[]> {
    let results = this.items;

    if (requesterRole !== "admin") {
      results = results.filter((l) => l.ownerId === requesterId);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter((l) => l.businessName.toLowerCase().includes(q));
    }

    if (filters.status) {
      results = results.filter((l) => l.status === filters.status);
    }

    if (filters.quality) {
      results = results.filter((l) => l.quality === filters.quality);
    }

    if (filters.isArchived !== undefined) {
      results = results.filter((l) => l.isArchived === filters.isArchived);
    }

    return results.map((l) => ({
      id: l.id.toString(),
      ownerId: l.ownerId,
      businessName: l.businessName,
      email: l.email ?? null,
      phone: l.phone ?? null,
      whatsapp: l.whatsapp ?? null,
      status: l.status,
      quality: l.quality ?? null,
      isArchived: l.isArchived,
      isProspect: l.isProspect,
      city: l.city ?? null,
      state: l.state ?? null,
      country: l.country ?? null,
      starRating: l.starRating ?? null,
      fieldsFilled: l.fieldsFilled ?? null,
      convertedToOrganizationId: l.convertedToOrganizationId ?? null,
      convertedAt: l.convertedAt ?? null,
      referredByPartnerId: l.referredByPartnerId ?? null,
      driveFolderId: l.driveFolderId ?? null,
      inOperationsAt: l.inOperationsAt ?? null,
      owner: null,
      referredByPartner: null,
      labels: [],
      primaryCNAE: null,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    }));
  }

  async findById(id: string, requesterId: string, requesterRole: string): Promise<LeadDetail | null> {
    const lead = this.items.find((l) => l.id.toString() === id);
    if (!lead) return null;
    if (requesterRole !== "admin" && lead.ownerId !== requesterId) return null;

    return {
      id: lead.id.toString(),
      ownerId: lead.ownerId,
      businessName: lead.businessName,
      registeredName: lead.registeredName ?? null,
      foundationDate: lead.foundationDate ?? null,
      companyRegistrationID: lead.companyRegistrationID ?? null,
      address: lead.address ?? null,
      city: lead.city ?? null,
      state: lead.state ?? null,
      country: lead.country ?? null,
      zipCode: lead.zipCode ?? null,
      phone: lead.phone ?? null,
      whatsapp: lead.whatsapp ?? null,
      email: lead.email ?? null,
      website: lead.website ?? null,
      instagram: lead.instagram ?? null,
      linkedin: lead.linkedin ?? null,
      quality: lead.quality ?? null,
      status: lead.status,
      starRating: lead.starRating ?? null,
      isArchived: lead.isArchived,
      archivedReason: lead.archivedReason ?? null,
      source: lead.source ?? null,
      languages: lead.languages ?? null,
      referredByPartnerId: lead.referredByPartnerId ?? null,
      owner: null,
      labels: [],
      referredByPartner: null,
      leadContacts: [],
      activities: [],
      secondaryCNAEs: [],
      techProfile: null,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    } as unknown as LeadDetail;
  }

  async findByIdRaw(id: string): Promise<Lead | null> {
    return this.items.find((l) => l.id.toString() === id) ?? null;
  }

  async save(lead: Lead): Promise<void> {
    const idx = this.items.findIndex((l) => l.id.equals(lead.id));
    if (idx >= 0) this.items[idx] = lead;
    else this.items.push(lead);
  }

  // In-memory: just saves the lead (relations ignored for unit tests)
  async saveWithRelations(lead: Lead, _relations: LeadRelations): Promise<void> {
    return this.save(lead);
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((l) => l.id.toString() !== id);
  }
}
