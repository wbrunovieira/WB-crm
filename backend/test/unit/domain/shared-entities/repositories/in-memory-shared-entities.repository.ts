import { SharedEntitiesRepository, type SharedUserInfo } from "@/domain/shared-entities/application/repositories/shared-entities.repository";
import { SharedEntity, type SharedEntityType } from "@/domain/shared-entities/enterprise/entities/shared-entity";

export class InMemorySharedEntitiesRepository extends SharedEntitiesRepository {
  public items: SharedEntity[] = [];
  public ownershipChanges: Array<{ entityType: string; entityId: string; newOwnerId: string }> = [];

  async findById(id: string): Promise<SharedEntity | null> {
    return this.items.find((i) => i.id.toString() === id) ?? null;
  }

  async findByEntity(entityType: SharedEntityType, entityId: string): Promise<SharedEntity[]> {
    return this.items.filter((i) => i.entityType === entityType && i.entityId === entityId);
  }

  async findSharedUserInfo(entityType: SharedEntityType, entityId: string): Promise<SharedUserInfo[]> {
    return this.items
      .filter((i) => i.entityType === entityType && i.entityId === entityId)
      .map((i) => ({
        shareId: i.id.toString(),
        userId: i.sharedWithUserId,
        userName: `User ${i.sharedWithUserId}`,
        userEmail: `${i.sharedWithUserId}@test.com`,
        sharedAt: i.createdAt,
      }));
  }

  async save(entity: SharedEntity): Promise<void> {
    const idx = this.items.findIndex(
      (i) => i.entityType === entity.entityType &&
             i.entityId === entity.entityId &&
             i.sharedWithUserId === entity.sharedWithUserId,
    );
    if (idx >= 0) this.items[idx] = entity;
    else this.items.push(entity);
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter((i) => i.id.toString() !== id);
  }

  async existsForUser(entityType: SharedEntityType, entityId: string, sharedWithUserId: string): Promise<boolean> {
    return this.items.some(
      (i) => i.entityType === entityType && i.entityId === entityId && i.sharedWithUserId === sharedWithUserId,
    );
  }

  async transferOwnership(entityType: SharedEntityType, entityId: string, newOwnerId: string): Promise<void> {
    this.ownershipChanges.push({ entityType, entityId, newOwnerId });
    this.items = this.items.filter((i) => !(i.entityType === entityType && i.entityId === entityId));
  }

  async findBatchSharedUsers(entityType: SharedEntityType, entityIds: string[]): Promise<Record<string, { id: string; name: string }[]>> {
    const result: Record<string, { id: string; name: string }[]> = {};
    for (const entityId of entityIds) {
      result[entityId] = this.items
        .filter((i) => i.entityType === entityType && i.entityId === entityId)
        .map((i) => ({ id: i.sharedWithUserId, name: `User ${i.sharedWithUserId}` }));
    }
    return result;
  }

  async findAvailableUsersForSharing(_entityType: SharedEntityType, _entityId: string): Promise<{ id: string; name: string; email: string }[]> {
    return [];
  }
}
