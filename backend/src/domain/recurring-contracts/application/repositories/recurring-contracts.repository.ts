import { RecurringContract } from "../../enterprise/entities/recurring-contract";

export abstract class RecurringContractsRepository {
  abstract findByOrganization(organizationId: string): Promise<RecurringContract[]>;
  abstract findByIdRaw(id: string): Promise<RecurringContract | null>;
  abstract create(contract: RecurringContract): Promise<void>;
  abstract save(contract: RecurringContract): Promise<void>;
  abstract delete(id: string): Promise<void>;
  /** Todos os contratos ativos do dono — base do total da carteira e dos avisos. */
  abstract findActiveByOwner(ownerId: string, requesterRole: string): Promise<RecurringContract[]>;
}
