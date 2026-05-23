import { WarmingAccount } from "../../enterprise/entities/warming-account.entity";

export abstract class WarmingAccountsRepository {
  abstract findById(id: string): Promise<WarmingAccount | null>;
  abstract findByEmail(email: string): Promise<WarmingAccount | null>;
  abstract findAllActive(ownerId: string): Promise<WarmingAccount[]>;
  abstract findAll(ownerId: string): Promise<WarmingAccount[]>;
  abstract save(account: WarmingAccount): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
