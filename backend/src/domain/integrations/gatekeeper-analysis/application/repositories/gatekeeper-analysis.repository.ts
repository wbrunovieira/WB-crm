import { GatekeeperAnalysis } from "../../enterprise/entities/gatekeeper-analysis.entity";

export abstract class GatekeeperAnalysisRepository {
  abstract save(analysis: GatekeeperAnalysis): Promise<void>;
  abstract findById(id: string): Promise<GatekeeperAnalysis | null>;
  abstract findByActivityId(activityId: string): Promise<GatekeeperAnalysis | null>;
  abstract findByJobId(jobId: string): Promise<GatekeeperAnalysis | null>;
  abstract findByIds(ids: string[]): Promise<GatekeeperAnalysis[]>;
  abstract findByOwner(ownerId: string): Promise<GatekeeperAnalysis[]>;
  abstract findAll(): Promise<GatekeeperAnalysis[]>;
}
