import { DisqualificationReasonsRepository } from "@/domain/disqualification-reasons/application/repositories/disqualification-reasons.repository";
import { DisqualificationReason } from "@/domain/disqualification-reasons/enterprise/entities/disqualification-reason";

export class InMemoryDisqualificationReasonsRepository extends DisqualificationReasonsRepository {
  items: DisqualificationReason[] = [];

  async findByOwner(ownerId: string): Promise<DisqualificationReason[]> {
    return this.items.filter(r => r.ownerId === ownerId);
  }

  async findById(id: string): Promise<DisqualificationReason | null> {
    return this.items.find(r => r.id.toString() === id) ?? null;
  }

  async existsByNameAndOwner(name: string, ownerId: string): Promise<boolean> {
    return this.items.some(r => r.name === name && r.ownerId === ownerId);
  }

  async save(reason: DisqualificationReason): Promise<void> {
    const idx = this.items.findIndex(r => r.id.equals(reason.id));
    if (idx >= 0) this.items[idx] = reason;
    else this.items.push(reason);
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter(r => r.id.toString() !== id);
  }
}
