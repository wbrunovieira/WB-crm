import { OrganizationsRepository } from "@/domain/organizations/application/repositories/organizations.repository";
import type { Organization } from "@/domain/organizations/enterprise/entities/organization";
import type { OrganizationSummary, OrganizationDetail } from "@/domain/organizations/enterprise/read-models/organization-read-models";

export class InMemoryOrganizationsRepository extends OrganizationsRepository {
  public items: Organization[] = [];
  public savedLabels: Map<string, string[]> = new Map();

  async findMany(requesterId: string, requesterRole: string, filters: { search?: string; hasHosting?: boolean; owner?: string } = {}): Promise<OrganizationSummary[]> {
    let results = this.items;

    if (requesterRole !== "admin") {
      results = results.filter((o) => o.ownerId === requesterId);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          (o.legalName ?? "").toLowerCase().includes(q) ||
          (o.email ?? "").toLowerCase().includes(q),
      );
    }

    if (filters.hasHosting !== undefined) {
      results = results.filter((o) => o.hasHosting === filters.hasHosting);
    }

    return results.map((o) => ({
      id: o.id.toString(),
      ownerId: o.ownerId,
      name: o.name,
      legalName: o.legalName ?? null,
      email: o.email ?? null,
      phone: o.phone ?? null,
      whatsapp: o.whatsapp ?? null,
      city: o.city ?? null,
      state: o.state ?? null,
      country: o.country ?? null,
      industry: o.industry ?? null,
      companySize: o.companySize ?? null,
      hasHosting: o.hasHosting,
      hostingRenewalDate: o.hostingRenewalDate ?? null,
      sourceLeadId: o.sourceLeadId ?? null,
      driveFolderId: o.driveFolderId ?? null,
      inOperationsAt: o.inOperationsAt ?? null,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      owner: null,
      primaryCNAE: null,
      labels: [],
      _count: { contacts: 0, deals: 0 },
    }));
  }

  async findById(id: string, requesterId: string, requesterRole: string): Promise<OrganizationDetail | null> {
    const org = this.items.find((o) => o.id.toString() === id);
    if (!org) return null;
    if (requesterRole !== "admin" && org.ownerId !== requesterId) return null;

    return {
      id: org.id.toString(),
      ownerId: org.ownerId,
      name: org.name,
      legalName: org.legalName ?? null,
      email: org.email ?? null,
      phone: org.phone ?? null,
      whatsapp: org.whatsapp ?? null,
      city: org.city ?? null,
      state: org.state ?? null,
      country: org.country ?? null,
      industry: org.industry ?? null,
      companySize: org.companySize ?? null,
      hasHosting: org.hasHosting,
      hostingRenewalDate: org.hostingRenewalDate ?? null,
      hostingPlan: org.hostingPlan ?? null,
      hostingValue: org.hostingValue ?? null,
      hostingReminderDays: org.hostingReminderDays,
      hostingNotes: org.hostingNotes ?? null,
      sourceLeadId: org.sourceLeadId ?? null,
      driveFolderId: org.driveFolderId ?? null,
      inOperationsAt: org.inOperationsAt ?? null,
      foundationDate: org.foundationDate ?? null,
      website: org.website ?? null,
      zipCode: org.zipCode ?? null,
      streetAddress: org.streetAddress ?? null,
      employeeCount: org.employeeCount ?? null,
      annualRevenue: org.annualRevenue ?? null,
      taxId: org.taxId ?? null,
      description: org.description ?? null,
      companyOwner: org.companyOwner ?? null,
      languages: org.languages ?? null,
      internationalActivity: org.internationalActivity ?? null,
      instagram: org.instagram ?? null,
      linkedin: org.linkedin ?? null,
      facebook: org.facebook ?? null,
      twitter: org.twitter ?? null,
      tiktok: org.tiktok ?? null,
      externalProjectIds: org.externalProjectIds ?? null,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
      owner: null,
      primaryCNAE: null,
      labels: [],
      _count: { contacts: 0, deals: 0 },
      contacts: [],
      deals: [],
      secondaryCNAEs: [],
      sectors: [],
      icps: [],
      techProfile: {
        languages: [],
        frameworks: [],
        hosting: [],
        databases: [],
        erps: [],
        crms: [],
        ecommerces: [],
      },
    };
  }

  async findByIdRaw(id: string): Promise<Organization | null> {
    return this.items.find((o) => o.id.toString() === id) ?? null;
  }

  async save(organization: Organization): Promise<void> {
    const idx = this.items.findIndex((o) => o.id.equals(organization.id));
    if (idx >= 0) this.items[idx] = organization;
    else this.items.push(organization);
  }

  async saveWithLabels(organization: Organization, labelIds: string[]): Promise<void> {
    await this.save(organization);
    this.savedLabels.set(organization.id.toString(), labelIds);
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((o) => o.id.toString() !== id);
  }
}
