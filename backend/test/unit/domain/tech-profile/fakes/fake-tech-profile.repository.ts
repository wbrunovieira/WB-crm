import { TechProfileRepository, TechProfileType, TechProfileItem, TechProfileResult } from "@/domain/tech-profile/application/repositories/tech-profile.repository";

const EMPTY_PROFILE: TechProfileResult = { languages: [], frameworks: [], hosting: [], databases: [], erps: [], crms: [], ecommerce: [] };

export class FakeTechProfileRepository extends TechProfileRepository {
  availableItems: Map<TechProfileType, TechProfileItem[]> = new Map();
  leadProfiles: Map<string, Map<TechProfileType, Set<string>>> = new Map();
  orgProfiles: Map<string, Map<TechProfileType, Set<string>>> = new Map();

  seedItem(type: TechProfileType, item: TechProfileItem): void {
    if (!this.availableItems.has(type)) this.availableItems.set(type, []);
    this.availableItems.get(type)!.push(item);
  }

  async getAvailableItems(type: TechProfileType): Promise<TechProfileItem[]> {
    return this.availableItems.get(type) ?? [];
  }

  private buildProfile(entityMap: Map<TechProfileType, Set<string>>): TechProfileResult {
    const resolve = (type: TechProfileType): TechProfileItem[] => {
      const ids = entityMap.get(type) ?? new Set();
      const items = this.availableItems.get(type) ?? [];
      return items.filter((i) => ids.has(i.id));
    };
    return { languages: resolve("language"), frameworks: resolve("framework"), hosting: resolve("hosting"), databases: resolve("database"), erps: resolve("erp"), crms: resolve("crm"), ecommerce: resolve("ecommerce") };
  }

  async getLeadTechProfile(leadId: string): Promise<TechProfileResult> {
    const map = this.leadProfiles.get(leadId);
    if (!map) return EMPTY_PROFILE;
    return this.buildProfile(map);
  }

  async addToLead(leadId: string, type: TechProfileType, itemId: string): Promise<void> {
    if (!this.leadProfiles.has(leadId)) this.leadProfiles.set(leadId, new Map());
    const map = this.leadProfiles.get(leadId)!;
    if (!map.has(type)) map.set(type, new Set());
    map.get(type)!.add(itemId);
  }

  async removeFromLead(leadId: string, type: TechProfileType, itemId: string): Promise<void> {
    this.leadProfiles.get(leadId)?.get(type)?.delete(itemId);
  }

  async getOrganizationTechProfile(organizationId: string): Promise<TechProfileResult> {
    const map = this.orgProfiles.get(organizationId);
    if (!map) return EMPTY_PROFILE;
    return this.buildProfile(map);
  }

  async addToOrganization(organizationId: string, type: TechProfileType, itemId: string): Promise<void> {
    if (!this.orgProfiles.has(organizationId)) this.orgProfiles.set(organizationId, new Map());
    const map = this.orgProfiles.get(organizationId)!;
    if (!map.has(type)) map.set(type, new Set());
    map.get(type)!.add(itemId);
  }

  async removeFromOrganization(organizationId: string, type: TechProfileType, itemId: string): Promise<void> {
    this.orgProfiles.get(organizationId)?.get(type)?.delete(itemId);
  }
}
