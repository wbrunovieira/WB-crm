import { GatekeeperBatch } from "../../enterprise/entities/gatekeeper-batch.entity";

export abstract class GatekeeperBatchRepository {
  abstract save(batch: GatekeeperBatch): Promise<void>;
  abstract findById(id: string): Promise<GatekeeperBatch | null>;
  abstract findByJobId(jobId: string): Promise<GatekeeperBatch | null>;
  abstract findByOwner(ownerId: string): Promise<GatekeeperBatch[]>;
  abstract findCompletedSummaries(ownerId: string): Promise<GatekeeperBatch[]>;
}
