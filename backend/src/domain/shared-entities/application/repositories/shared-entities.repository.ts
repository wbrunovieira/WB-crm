import type { SharedEntity, SharedEntityType } from "../../enterprise/entities/shared-entity";

export interface SharedUserInfo {
  shareId: string;
  userId: string;
  userName: string;
  userEmail: string;
  sharedAt: Date;
}

export abstract class SharedEntitiesRepository {
  abstract findById(id: string): Promise<SharedEntity | null>;
  abstract findByEntity(entityType: SharedEntityType, entityId: string): Promise<SharedEntity[]>;
  abstract findSharedUserInfo(entityType: SharedEntityType, entityId: string): Promise<SharedUserInfo[]>;
  abstract save(entity: SharedEntity): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract existsForUser(entityType: SharedEntityType, entityId: string, sharedWithUserId: string): Promise<boolean>;

  // Transfer: update ownerId on the actual entity table
  abstract transferOwnership(entityType: SharedEntityType, entityId: string, newOwnerId: string): Promise<void>;
}
