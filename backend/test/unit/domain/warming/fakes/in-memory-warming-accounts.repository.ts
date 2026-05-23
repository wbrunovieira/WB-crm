import { WarmingAccountsRepository } from "@/domain/warming/application/repositories/warming-accounts.repository";
import { WarmingAccount } from "@/domain/warming/enterprise/entities/warming-account.entity";

export class InMemoryWarmingAccountsRepository implements WarmingAccountsRepository {
  items: WarmingAccount[] = [];

  async findById(id: string): Promise<WarmingAccount | null> {
    return this.items.find((a) => a.id.toString() === id) ?? null;
  }

  async findByEmail(email: string): Promise<WarmingAccount | null> {
    return this.items.find((a) => a.email === email) ?? null;
  }

  async findAllActive(ownerId: string): Promise<WarmingAccount[]> {
    return this.items.filter((a) => a.ownerId === ownerId && a.isActive);
  }

  async findAll(ownerId: string): Promise<WarmingAccount[]> {
    return this.items.filter((a) => a.ownerId === ownerId);
  }

  async save(account: WarmingAccount): Promise<void> {
    const idx = this.items.findIndex((a) => a.id.equals(account.id));
    if (idx >= 0) {
      this.items[idx] = account;
    } else {
      this.items.push(account);
    }
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((a) => a.id.toString() !== id);
  }
}
