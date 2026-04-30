import { MeetAnalysis } from "../../enterprise/entities/meet-analysis.entity";

export abstract class MeetAnalysisRepository {
  abstract save(analysis: MeetAnalysis): Promise<void>;
  abstract findById(id: string): Promise<MeetAnalysis | null>;
  abstract findByActivityId(activityId: string): Promise<MeetAnalysis | null>;
  abstract findByJobId(jobId: string): Promise<MeetAnalysis | null>;
  abstract findByOwner(ownerId: string): Promise<MeetAnalysis[]>;
  abstract findAll(): Promise<MeetAnalysis[]>;
}
