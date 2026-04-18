import { PartnersRepository, type PartnerFilters } from "@/domain/partners/application/repositories/partners.repository";
import type { Partner } from "@/domain/partners/enterprise/entities/partner";
import type { PartnerSummary, PartnerDetail } from "@/domain/partners/enterprise/read-models/partner-read-models";

export class InMemoryPartnersRepository extends PartnersRepository {
  public items: Partner[] = [];

  async findMany(requesterId: string, requesterRole: string, filters: PartnerFilters = {}): Promise<PartnerSummary[]> {
    let results = this.items;

    if (requesterRole !== "admin") {
      results = results.filter((p) => p.ownerId === requesterId);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.partnerType.toLowerCase().includes(q) ||
          (p.expertise ?? "").toLowerCase().includes(q),
      );
    }

    return results.map((p) => ({
      id: p.id.toString(),
      ownerId: p.ownerId,
      name: p.name,
      legalName: p.legalName ?? null,
      partnerType: p.partnerType,
      email: p.email ?? null,
      phone: p.phone ?? null,
      city: p.city ?? null,
      state: p.state ?? null,
      country: p.country ?? null,
      industry: p.industry ?? null,
      expertise: p.expertise ?? null,
      companySize: p.companySize ?? null,
      lastContactDate: p.lastContactDate ?? null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      owner: null,
      _count: { contacts: 0, activities: 0, referredLeads: 0 },
    }));
  }

  async findById(id: string, requesterId: string, requesterRole: string): Promise<PartnerDetail | null> {
    const partner = this.items.find((p) => p.id.toString() === id);
    if (!partner) return null;
    if (requesterRole !== "admin" && partner.ownerId !== requesterId) return null;

    return {
      id: partner.id.toString(),
      ownerId: partner.ownerId,
      name: partner.name,
      legalName: partner.legalName ?? null,
      partnerType: partner.partnerType,
      email: partner.email ?? null,
      phone: partner.phone ?? null,
      city: partner.city ?? null,
      state: partner.state ?? null,
      country: partner.country ?? null,
      industry: partner.industry ?? null,
      expertise: partner.expertise ?? null,
      companySize: partner.companySize ?? null,
      lastContactDate: partner.lastContactDate ?? null,
      foundationDate: partner.foundationDate ?? null,
      website: partner.website ?? null,
      whatsapp: partner.whatsapp ?? null,
      zipCode: partner.zipCode ?? null,
      streetAddress: partner.streetAddress ?? null,
      employeeCount: partner.employeeCount ?? null,
      description: partner.description ?? null,
      notes: partner.notes ?? null,
      linkedin: partner.linkedin ?? null,
      instagram: partner.instagram ?? null,
      facebook: partner.facebook ?? null,
      twitter: partner.twitter ?? null,
      createdAt: partner.createdAt,
      updatedAt: partner.updatedAt,
      owner: null,
      _count: { contacts: 0, activities: 0, referredLeads: 0 },
      contacts: [],
      activities: [],
      referredLeads: [],
    };
  }

  async findByIdRaw(id: string): Promise<Partner | null> {
    return this.items.find((p) => p.id.toString() === id) ?? null;
  }

  async save(partner: Partner): Promise<void> {
    const idx = this.items.findIndex((p) => p.id.equals(partner.id));
    if (idx >= 0) this.items[idx] = partner;
    else this.items.push(partner);
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((p) => p.id.toString() !== id);
  }
}
