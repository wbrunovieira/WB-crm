import { CallAnalysis } from "../../enterprise/entities/call-analysis.entity";

export abstract class CallAnalysisRepository {
  abstract save(analysis: CallAnalysis): Promise<void>;
  abstract findById(id: string): Promise<CallAnalysis | null>;
  abstract findByActivityId(activityId: string): Promise<CallAnalysis | null>;
  abstract findByJobId(jobId: string): Promise<CallAnalysis | null>;
  abstract findByOwner(ownerId: string): Promise<CallAnalysis[]>;
  abstract findAll(): Promise<CallAnalysis[]>;
}
