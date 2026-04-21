export type OperationsEntityType = "lead" | "organization";

export interface OperationsSearchResult {
  id: string;
  name: string;
  type: OperationsEntityType;
  inOperationsAt: Date | null;
}

export abstract class OperationsRepository {
  abstract transferToOperations(entityType: OperationsEntityType, entityId: string, transferredAt: Date): Promise<void>;
  abstract revertFromOperations(entityType: OperationsEntityType, entityId: string): Promise<void>;
  abstract findById(entityType: OperationsEntityType, entityId: string): Promise<{ id: string; ownerId: string; inOperationsAt: Date | null } | null>;
  abstract search(query: string): Promise<OperationsSearchResult[]>;
}
