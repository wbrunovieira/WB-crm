import { WarmingSendsRepository } from "@/domain/warming/application/repositories/warming-sends.repository";
import { WarmingSend } from "@/domain/warming/enterprise/entities/warming-send.entity";

export class InMemoryWarmingSendsRepository implements WarmingSendsRepository {
  items: WarmingSend[] = [];

  async save(send: WarmingSend): Promise<void> {
    this.items.push(send);
  }

  async countTodayByAccount(warmingAccountId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.items.filter(
      (s) => s.warmingAccountId === warmingAccountId && s.sentAt >= today,
    ).length;
  }

  async findRecentByAccount(warmingAccountId: string, limit: number): Promise<WarmingSend[]> {
    return this.items
      .filter((s) => s.warmingAccountId === warmingAccountId)
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
      .slice(0, limit);
  }

  async findAll(
    ownerId: string,
    page: number,
    pageSize: number,
  ): Promise<{ sends: WarmingSend[]; total: number }> {
    // ownerId filter via warmingAccountId would need a join; for in-memory just return all
    const sorted = [...this.items].sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
    const total = sorted.length;
    const sends = sorted.slice((page - 1) * pageSize, page * pageSize);
    return { sends, total };
  }
}
