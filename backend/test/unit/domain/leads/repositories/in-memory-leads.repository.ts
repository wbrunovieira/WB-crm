import { LeadsRepository, type LeadFilters, type LeadRelations, type PaginatedLeads, type LeadSelectItem } from "@/domain/leads/application/repositories/leads.repository";
import type { Lead } from "@/domain/leads/enterprise/entities/lead";
import type { LeadSummary, LeadDetail } from "@/domain/leads/enterprise/read-models/lead-read-models";

export class InMemoryLeadsRepository extends LeadsRepository {
  public items: Lead[] = [];
  // Auxiliary maps for filter testing (leadId → data)
  public leadContacts: Map<string, string[]> = new Map(); // leadId → contact names
  public leadIcps: Map<string, string[]> = new Map();     // leadId → icp ids
  public leadHasCadence: Map<string, boolean> = new Map(); // leadId → has cadence

  async findMany(requesterId: string, requesterRole: string, filters: LeadFilters = {}): Promise<PaginatedLeads> {
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

    if (filters.contactSearch) {
      const q = filters.contactSearch.toLowerCase();
      results = results.filter((l) => {
        const contacts = this.leadContacts.get(l.id.toString()) ?? [];
        return contacts.some((name) => name.toLowerCase().includes(q));
      });
    }

    if (filters.icpId) {
      results = results.filter((l) => {
        const icps = this.leadIcps.get(l.id.toString()) ?? [];
        return icps.includes(filters.icpId!);
      });
    }

    if (filters.hasCadence === "yes") {
      results = results.filter((l) => this.leadHasCadence.get(l.id.toString()) === true);
    } else if (filters.hasCadence === "no") {
      results = results.filter((l) => this.leadHasCadence.get(l.id.toString()) !== true);
    }

    const total = results.length;
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 50;
    results = results.slice((page - 1) * pageSize, page * pageSize);

    const leads: LeadSummary[] = results.map((l) => ({
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

    return { leads, total, page, pageSize };
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

  async findForSelect(_requesterId: string, _requesterRole: string): Promise<LeadSelectItem[]> {
    return this.items.map((l) => ({
      id: l.id.toString(),
      businessName: l.businessName,
      leadContacts: [],
    }));
  }
}
