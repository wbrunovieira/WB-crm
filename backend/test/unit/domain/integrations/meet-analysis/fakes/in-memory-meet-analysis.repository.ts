import { MeetAnalysis } from "@/domain/integrations/meet-analysis/enterprise/entities/meet-analysis.entity";
import { MeetAnalysisRepository } from "@/domain/integrations/meet-analysis/application/repositories/meet-analysis.repository";

export class InMemoryMeetAnalysisRepository extends MeetAnalysisRepository {
  items: MeetAnalysis[] = [];

  async save(analysis: MeetAnalysis): Promise<void> {
    const idx = this.items.findIndex((i) => i.id.equals(analysis.id));
    if (idx >= 0) {
      this.items[idx] = analysis;
    } else {
      this.items.push(analysis);
    }
  }

  async findById(id: string): Promise<MeetAnalysis | null> {
    return this.items.find((i) => i.id.toString() === id) ?? null;
  }

  async findByActivityId(activityId: string): Promise<MeetAnalysis | null> {
    return this.items.find((i) => i.activityId === activityId) ?? null;
  }

  async findByJobId(jobId: string): Promise<MeetAnalysis | null> {
    return this.items.find((i) => i.jobId === jobId) ?? null;
  }

  async findByOwner(ownerId: string): Promise<MeetAnalysis[]> {
    return this.items.filter((i) => i.ownerId === ownerId);
  }

  async findAll(): Promise<MeetAnalysis[]> {
    return [...this.items];
  }
}
