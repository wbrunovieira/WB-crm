import { CnaeRepository, CnaeRecord } from "@/domain/cnae/application/repositories/cnae.repository";

export class FakeCnaeRepository extends CnaeRepository {
  public items: CnaeRecord[] = [];
  public leadLinks: Map<string, Set<string>> = new Map();
  public orgLinks: Map<string, Set<string>> = new Map();

  async search(query: string, limit = 20): Promise<CnaeRecord[]> {
    const q = query.toLowerCase();
    return this.items
      .filter((c) => c.code.includes(q) || c.description.toLowerCase().includes(q))
      .slice(0, limit);
  }

  async findById(id: string): Promise<CnaeRecord | null> {
    return this.items.find((c) => c.id === id) ?? null;
  }

  async addToLead(cnaeId: string, leadId: string): Promise<void> {
    if (!this.leadLinks.has(leadId)) this.leadLinks.set(leadId, new Set());
    this.leadLinks.get(leadId)!.add(cnaeId);
  }

  async removeFromLead(cnaeId: string, leadId: string): Promise<void> {
    this.leadLinks.get(leadId)?.delete(cnaeId);
  }

  async addToOrganization(cnaeId: string, orgId: string): Promise<void> {
    if (!this.orgLinks.has(orgId)) this.orgLinks.set(orgId, new Set());
    this.orgLinks.get(orgId)!.add(cnaeId);
  }

  async removeFromOrganization(cnaeId: string, orgId: string): Promise<void> {
    this.orgLinks.get(orgId)?.delete(cnaeId);
  }

  seed(records: CnaeRecord[]): void {
    this.items.push(...records);
  }
}
