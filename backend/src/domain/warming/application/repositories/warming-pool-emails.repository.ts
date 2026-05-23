import { WarmingPoolEmail } from "../../enterprise/entities/warming-pool-email.entity";

export abstract class WarmingPoolEmailsRepository {
  abstract findById(id: string): Promise<WarmingPoolEmail | null>;
  abstract findAll(ownerId: string): Promise<WarmingPoolEmail[]>;
  abstract findAllActive(ownerId: string): Promise<WarmingPoolEmail[]>;
  abstract findByEmail(email: string, ownerId: string): Promise<WarmingPoolEmail | null>;
  abstract save(poolEmail: WarmingPoolEmail): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
