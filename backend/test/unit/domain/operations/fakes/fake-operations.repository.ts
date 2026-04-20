import { OperationsRepository, OperationsEntityType } from "@/domain/operations/application/repositories/operations.repository";

interface FakeEntity { id: string; ownerId: string; inOperationsAt: Date | null; }

export class FakeOperationsRepository extends OperationsRepository {
  entities: Map<string, FakeEntity> = new Map();

  seed(entityType: OperationsEntityType, entity: FakeEntity): void {
    this.entities.set(`${entityType}:${entity.id}`, entity);
  }

  async findById(entityType: OperationsEntityType, entityId: string): Promise<FakeEntity | null> {
    return this.entities.get(`${entityType}:${entityId}`) ?? null;
  }

  async transferToOperations(entityType: OperationsEntityType, entityId: string, transferredAt: Date): Promise<void> {
    const key = `${entityType}:${entityId}`;
    const entity = this.entities.get(key);
    if (entity) this.entities.set(key, { ...entity, inOperationsAt: transferredAt });
  }

  async revertFromOperations(entityType: OperationsEntityType, entityId: string): Promise<void> {
    const key = `${entityType}:${entityId}`;
    const entity = this.entities.get(key);
    if (entity) this.entities.set(key, { ...entity, inOperationsAt: null });
  }
}
