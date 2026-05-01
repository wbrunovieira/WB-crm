import { GatekeeperAnalysis } from "@/domain/integrations/gatekeeper-analysis/enterprise/entities/gatekeeper-analysis.entity";
import { GatekeeperAnalysisRepository } from "@/domain/integrations/gatekeeper-analysis/application/repositories/gatekeeper-analysis.repository";

export class InMemoryGatekeeperAnalysisRepository extends GatekeeperAnalysisRepository {
  items: GatekeeperAnalysis[] = [];

  async save(a: GatekeeperAnalysis): Promise<void> {
    const idx = this.items.findIndex((i) => i.id.equals(a.id));
    if (idx >= 0) this.items[idx] = a; else this.items.push(a);
  }
  async findById(id: string)         { return this.items.find((i) => i.id.toString() === id) ?? null; }
  async findByActivityId(activityId: string) { return this.items.find((i) => i.activityId === activityId) ?? null; }
  async findByJobId(jobId: string)   { return this.items.find((i) => i.jobId === jobId) ?? null; }
  async findByIds(ids: string[])     { return this.items.filter((i) => ids.includes(i.id.toString())); }
  async findByOwner(ownerId: string) { return this.items.filter((i) => i.ownerId === ownerId); }
  async findAll()                    { return [...this.items]; }
}
