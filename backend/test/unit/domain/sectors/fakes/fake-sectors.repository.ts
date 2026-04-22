import { SectorsRepository } from "@/domain/sectors/application/repositories/sectors.repository";
import { Sector } from "@/domain/sectors/enterprise/entities/sector";

export class FakeSectorsRepository extends SectorsRepository {
  public items: Sector[] = [];
  public leadLinks: Map<string, Set<string>> = new Map();
  public orgLinks: Map<string, Set<string>> = new Map();

  async findById(id: string): Promise<Sector | null> {
    return this.items.find((s) => s.id.toString() === id) ?? null;
  }

  async findByOwner(ownerId: string): Promise<Sector[]> {
    return this.items.filter((s) => s.ownerId === ownerId);
  }

  async existsBySlugAndOwner(slug: string, ownerId: string): Promise<boolean> {
    return this.items.some((s) => s.slug === slug && s.ownerId === ownerId);
  }

  async save(sector: Sector): Promise<void> {
    const idx = this.items.findIndex((s) => s.id.toString() === sector.id.toString());
    if (idx >= 0) this.items[idx] = sector;
    else this.items.push(sector);
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((s) => s.id.toString() !== id);
  }

  async addToLead(sectorId: string, leadId: string): Promise<void> {
    if (!this.leadLinks.has(leadId)) this.leadLinks.set(leadId, new Set());
    this.leadLinks.get(leadId)!.add(sectorId);
  }

  async removeFromLead(sectorId: string, leadId: string): Promise<void> {
    this.leadLinks.get(leadId)?.delete(sectorId);
  }

  async findByLead(leadId: string): Promise<Sector[]> {
    const ids = this.leadLinks.get(leadId) ?? new Set();
    return this.items.filter((s) => ids.has(s.id.toString()));
  }

  async addToOrganization(sectorId: string, orgId: string): Promise<void> {
    if (!this.orgLinks.has(orgId)) this.orgLinks.set(orgId, new Set());
    this.orgLinks.get(orgId)!.add(sectorId);
  }

  async removeFromOrganization(sectorId: string, orgId: string): Promise<void> {
    this.orgLinks.get(orgId)?.delete(sectorId);
  }

  async findByOrganization(orgId: string): Promise<Sector[]> {
    const ids = this.orgLinks.get(orgId) ?? new Set();
    return this.items.filter((s) => ids.has(s.id.toString()));
  }
}
