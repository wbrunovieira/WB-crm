import { CallAnalysisRepository } from "@/domain/integrations/call-analysis/application/repositories/call-analysis.repository";
import { CallAnalysis } from "@/domain/integrations/call-analysis/enterprise/entities/call-analysis.entity";

export class InMemoryCallAnalysisRepository extends CallAnalysisRepository {
  public items: CallAnalysis[] = [];

  async save(analysis: CallAnalysis): Promise<void> {
    const index = this.items.findIndex((item) =>
      item.id.equals(analysis.id),
    );
    if (index >= 0) {
      this.items[index] = analysis;
    } else {
      this.items.push(analysis);
    }
  }

  async findById(id: string): Promise<CallAnalysis | null> {
    return this.items.find((item) => item.id.toString() === id) ?? null;
  }

  async findByActivityId(activityId: string): Promise<CallAnalysis | null> {
    return (
      this.items.find((item) => item.activityId === activityId) ?? null
    );
  }

  async findByJobId(jobId: string): Promise<CallAnalysis | null> {
    return this.items.find((item) => item.jobId === jobId) ?? null;
  }

  async findByOwner(ownerId: string): Promise<CallAnalysis[]> {
    return this.items.filter((item) => item.ownerId === ownerId);
  }

  async findAll(): Promise<CallAnalysis[]> {
    return [...this.items];
  }
}
