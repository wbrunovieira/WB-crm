import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { SharedEntitiesRepository, type SharedUserInfo } from "@/domain/shared-entities/application/repositories/shared-entities.repository";
import { SharedEntity, type SharedEntityType } from "@/domain/shared-entities/enterprise/entities/shared-entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

const ENTITY_TABLE: Record<SharedEntityType, string> = {
  lead: "lead",
  contact: "contact",
  organization: "organization",
  partner: "partner",
  deal: "deal",
};

@Injectable()
export class PrismaSharedEntitiesRepository extends SharedEntitiesRepository {
  constructor(private readonly prisma: PrismaService) { super(); }

  private toDomain(row: {
    id: string; entityType: string; entityId: string;
    sharedWithUserId: string; sharedByUserId: string; createdAt: Date;
  }): SharedEntity {
    return SharedEntity.create(
      {
        entityType: row.entityType as SharedEntityType,
        entityId: row.entityId,
        sharedWithUserId: row.sharedWithUserId,
        sharedByUserId: row.sharedByUserId,
        createdAt: row.createdAt,
      },
      new UniqueEntityID(row.id),
    );
  }

  async findById(id: string): Promise<SharedEntity | null> {
    const row = await this.prisma.sharedEntity.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByEntity(entityType: SharedEntityType, entityId: string): Promise<SharedEntity[]> {
    const rows = await this.prisma.sharedEntity.findMany({
      where: { entityType, entityId },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async findSharedUserInfo(entityType: SharedEntityType, entityId: string): Promise<SharedUserInfo[]> {
    const rows = await this.prisma.sharedEntity.findMany({
      where: { entityType, entityId },
      include: { sharedWithUser: { select: { id: true, name: true, email: true } } },
    });
    return rows.map((r) => ({
      shareId: r.id,
      userId: r.sharedWithUser.id,
      userName: r.sharedWithUser.name,
      userEmail: r.sharedWithUser.email,
      sharedAt: r.createdAt,
    }));
  }

  async save(entity: SharedEntity): Promise<void> {
    await this.prisma.sharedEntity.upsert({
      where: {
        entityType_entityId_sharedWithUserId: {
          entityType: entity.entityType,
          entityId: entity.entityId,
          sharedWithUserId: entity.sharedWithUserId,
        },
      },
      create: {
        id: entity.id.toString(),
        entityType: entity.entityType,
        entityId: entity.entityId,
        sharedWithUserId: entity.sharedWithUserId,
        sharedByUserId: entity.sharedByUserId,
        createdAt: entity.createdAt,
      },
      update: {},
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.sharedEntity.delete({ where: { id } });
  }

  async existsForUser(entityType: SharedEntityType, entityId: string, sharedWithUserId: string): Promise<boolean> {
    const count = await this.prisma.sharedEntity.count({
      where: { entityType, entityId, sharedWithUserId },
    });
    return count > 0;
  }

  async transferOwnership(entityType: SharedEntityType, entityId: string, newOwnerId: string): Promise<void> {
    const model = ENTITY_TABLE[entityType];
    // Dynamic Prisma call via model map
    await (this.prisma as any)[model].update({
      where: { id: entityId },
      data: { ownerId: newOwnerId },
    });
    // Remove all shares after transfer (new owner can manage their own)
    await this.prisma.sharedEntity.deleteMany({ where: { entityType, entityId } });
  }
}
