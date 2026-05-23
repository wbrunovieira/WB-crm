import { WarmingPoolEmailsRepository } from "@/domain/warming/application/repositories/warming-pool-emails.repository";
import { WarmingPoolEmail } from "@/domain/warming/enterprise/entities/warming-pool-email.entity";

export class InMemoryWarmingPoolEmailsRepository implements WarmingPoolEmailsRepository {
  items: WarmingPoolEmail[] = [];

  async findById(id: string): Promise<WarmingPoolEmail | null> {
    return this.items.find((p) => p.id.toString() === id) ?? null;
  }

  async findAll(ownerId: string): Promise<WarmingPoolEmail[]> {
    return this.items.filter((p) => p.ownerId === ownerId);
  }

  async findAllActive(ownerId: string): Promise<WarmingPoolEmail[]> {
    return this.items.filter((p) => p.ownerId === ownerId && p.isActive);
  }

  async findByEmail(email: string, ownerId: string): Promise<WarmingPoolEmail | null> {
    return this.items.find((p) => p.email === email && p.ownerId === ownerId) ?? null;
  }

  async save(poolEmail: WarmingPoolEmail): Promise<void> {
    const idx = this.items.findIndex((p) => p.id.equals(poolEmail.id));
    if (idx >= 0) {
      this.items[idx] = poolEmail;
    } else {
      this.items.push(poolEmail);
    }
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((p) => p.id.toString() !== id);
  }
}
