import { LabelsRepository } from "@/domain/labels/application/repositories/labels.repository";
import { Label } from "@/domain/labels/enterprise/entities/label";

export class FakeLabelsRepository extends LabelsRepository {
  public items: Label[] = [];
  public leadLinks: Map<string, Set<string>> = new Map(); // leadId → Set<labelId>
  public orgLinks: Map<string, Set<string>> = new Map();  // orgId → Set<labelId>

  async findById(id: string): Promise<Label | null> {
    return this.items.find((l) => l.id.toString() === id) ?? null;
  }

  async findByOwner(ownerId: string): Promise<Label[]> {
    return this.items.filter((l) => l.ownerId === ownerId);
  }

  async existsByNameAndOwner(name: string, ownerId: string): Promise<boolean> {
    return this.items.some((l) => l.name === name && l.ownerId === ownerId);
  }

  async save(label: Label): Promise<void> {
    const idx = this.items.findIndex((l) => l.id.toString() === label.id.toString());
    if (idx >= 0) this.items[idx] = label;
    else this.items.push(label);
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((l) => l.id.toString() !== id);
  }

  async addToLead(labelId: string, leadId: string): Promise<void> {
    if (!this.leadLinks.has(leadId)) this.leadLinks.set(leadId, new Set());
    this.leadLinks.get(leadId)!.add(labelId);
  }

  async removeFromLead(labelId: string, leadId: string): Promise<void> {
    this.leadLinks.get(leadId)?.delete(labelId);
  }

  async setLeadLabels(leadId: string, labelIds: string[]): Promise<void> {
    this.leadLinks.set(leadId, new Set(labelIds));
  }

  async addToOrganization(labelId: string, orgId: string): Promise<void> {
    if (!this.orgLinks.has(orgId)) this.orgLinks.set(orgId, new Set());
    this.orgLinks.get(orgId)!.add(labelId);
  }

  async removeFromOrganization(labelId: string, orgId: string): Promise<void> {
    this.orgLinks.get(orgId)?.delete(labelId);
  }

  async setOrganizationLabels(orgId: string, labelIds: string[]): Promise<void> {
    this.orgLinks.set(orgId, new Set(labelIds));
  }
}
