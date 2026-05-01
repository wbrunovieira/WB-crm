import { GatekeeperBatch } from "@/domain/integrations/gatekeeper-analysis/enterprise/entities/gatekeeper-batch.entity";
import { GatekeeperBatchRepository } from "@/domain/integrations/gatekeeper-analysis/application/repositories/gatekeeper-batch.repository";

export class InMemoryGatekeeperBatchRepository extends GatekeeperBatchRepository {
  items: GatekeeperBatch[] = [];

  async save(b: GatekeeperBatch): Promise<void> {
    const idx = this.items.findIndex((i) => i.id.equals(b.id));
    if (idx >= 0) this.items[idx] = b; else this.items.push(b);
  }
  async findById(id: string)       { return this.items.find((i) => i.id.toString() === id) ?? null; }
  async findByJobId(jobId: string) { return this.items.find((i) => i.jobId === jobId) ?? null; }
  async findByOwner(ownerId: string) { return this.items.filter((i) => i.ownerId === ownerId); }
  async findCompletedSummaries(ownerId: string) {
    return this.items
      .filter((i) => i.ownerId === ownerId && i.status === "completed" && !!i.newSummary)
      .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
  }
}
