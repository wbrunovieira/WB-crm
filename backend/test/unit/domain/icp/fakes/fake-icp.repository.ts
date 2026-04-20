import { ICPRepository, ICPLinkData, LeadICPRecord, OrganizationICPRecord } from "@/domain/icp/application/repositories/icp.repository";
import { ICP } from "@/domain/icp/enterprise/entities/icp";

export class FakeICPRepository extends ICPRepository {
  items: ICP[] = [];
  leadLinks: Map<string, Map<string, ICPLinkData>> = new Map();
  orgLinks: Map<string, Map<string, ICPLinkData>> = new Map();

  async findById(id: string): Promise<ICP | null> {
    return this.items.find((i) => i.id.toString() === id) ?? null;
  }

  async findByOwner(ownerId: string): Promise<ICP[]> {
    return this.items.filter((i) => i.ownerId === ownerId);
  }

  async existsBySlugAndOwner(slug: string, ownerId: string): Promise<boolean> {
    return this.items.some((i) => i.slug === slug && i.ownerId === ownerId);
  }

  async save(icp: ICP): Promise<void> {
    const idx = this.items.findIndex((i) => i.id.equals(icp.id));
    if (idx >= 0) this.items[idx] = icp;
    else this.items.push(icp);
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((i) => i.id.toString() !== id);
  }

  async getLeadICPs(leadId: string): Promise<LeadICPRecord[]> {
    const map = this.leadLinks.get(leadId) ?? new Map();
    return Array.from(map.entries()).map(([icpId, data]) => {
      const icp = this.items.find((i) => i.id.toString() === icpId);
      return { id: `link-${leadId}-${icpId}`, leadId, icpId, icpName: icp?.name ?? "", icpSlug: icp?.slug ?? "", createdAt: new Date(), updatedAt: new Date(), ...data };
    });
  }

  async linkToLead(icpId: string, leadId: string, data?: ICPLinkData): Promise<void> {
    if (!this.leadLinks.has(leadId)) this.leadLinks.set(leadId, new Map());
    this.leadLinks.get(leadId)!.set(icpId, data ?? {});
  }

  async updateLeadLink(icpId: string, leadId: string, data: ICPLinkData): Promise<void> {
    if (!this.leadLinks.has(leadId)) this.leadLinks.set(leadId, new Map());
    const existing = this.leadLinks.get(leadId)!.get(icpId) ?? {};
    this.leadLinks.get(leadId)!.set(icpId, { ...existing, ...data });
  }

  async unlinkFromLead(icpId: string, leadId: string): Promise<void> {
    this.leadLinks.get(leadId)?.delete(icpId);
  }

  async getOrganizationICPs(organizationId: string): Promise<OrganizationICPRecord[]> {
    const map = this.orgLinks.get(organizationId) ?? new Map();
    return Array.from(map.entries()).map(([icpId, data]) => {
      const icp = this.items.find((i) => i.id.toString() === icpId);
      return { id: `link-${organizationId}-${icpId}`, organizationId, icpId, icpName: icp?.name ?? "", icpSlug: icp?.slug ?? "", createdAt: new Date(), updatedAt: new Date(), ...data };
    });
  }

  async linkToOrganization(icpId: string, organizationId: string, data?: ICPLinkData): Promise<void> {
    if (!this.orgLinks.has(organizationId)) this.orgLinks.set(organizationId, new Map());
    this.orgLinks.get(organizationId)!.set(icpId, data ?? {});
  }

  async updateOrganizationLink(icpId: string, organizationId: string, data: ICPLinkData): Promise<void> {
    if (!this.orgLinks.has(organizationId)) this.orgLinks.set(organizationId, new Map());
    const existing = this.orgLinks.get(organizationId)!.get(icpId) ?? {};
    this.orgLinks.get(organizationId)!.set(icpId, { ...existing, ...data });
  }

  async unlinkFromOrganization(icpId: string, organizationId: string): Promise<void> {
    this.orgLinks.get(organizationId)?.delete(icpId);
  }
}
