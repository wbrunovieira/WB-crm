import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { SharedEntitiesRepository, type SharedUserInfo } from "../repositories/shared-entities.repository";
import { SharedEntity, type SharedEntityType, SHARED_ENTITY_TYPES } from "../../enterprise/entities/shared-entity";

// ─── Share ────────────────────────────────────────────────────────────────────

export interface ShareEntityInput {
  entityType: SharedEntityType;
  entityId: string;
  sharedWithUserId: string;
  requesterRole: string;
  requesterId: string;
}

@Injectable()
export class ShareEntityUseCase {
  constructor(private readonly repo: SharedEntitiesRepository) {}

  async execute(input: ShareEntityInput): Promise<Either<Error, { share: SharedEntity }>> {
    if (input.requesterRole !== "admin") {
      return left(new Error("Apenas administradores podem compartilhar entidades"));
    }

    if (!SHARED_ENTITY_TYPES.includes(input.entityType)) {
      return left(new Error(`Tipo inválido: ${input.entityType}`));
    }

    if (input.sharedWithUserId === input.requesterId) {
      return left(new Error("Não é possível compartilhar com o próprio usuário"));
    }

    const alreadyShared = await this.repo.existsForUser(input.entityType, input.entityId, input.sharedWithUserId);
    if (alreadyShared) {
      return left(new Error("Entidade já compartilhada com este usuário"));
    }

    const share = SharedEntity.create({
      entityType: input.entityType,
      entityId: input.entityId,
      sharedWithUserId: input.sharedWithUserId,
      sharedByUserId: input.requesterId,
      createdAt: new Date(),
    });

    await this.repo.save(share);
    return right({ share });
  }
}

// ─── Unshare ──────────────────────────────────────────────────────────────────

@Injectable()
export class UnshareEntityUseCase {
  constructor(private readonly repo: SharedEntitiesRepository) {}

  async execute(shareId: string, requesterRole: string): Promise<Either<Error, void>> {
    if (requesterRole !== "admin") {
      return left(new Error("Apenas administradores podem remover compartilhamentos"));
    }

    const share = await this.repo.findById(shareId);
    if (!share) return left(new Error("Compartilhamento não encontrado"));

    await this.repo.delete(shareId);
    return right(undefined);
  }
}

// ─── Get Shares for Entity ────────────────────────────────────────────────────

@Injectable()
export class GetEntitySharesUseCase {
  constructor(private readonly repo: SharedEntitiesRepository) {}

  async execute(
    entityType: SharedEntityType,
    entityId: string,
    requesterRole: string,
  ): Promise<Either<Error, { shares: SharedUserInfo[] }>> {
    if (requesterRole !== "admin") {
      return left(new Error("Apenas administradores podem visualizar compartilhamentos"));
    }

    const shares = await this.repo.findSharedUserInfo(entityType, entityId);
    return right({ shares });
  }
}

// ─── Transfer Ownership ───────────────────────────────────────────────────────

export interface TransferEntityInput {
  entityType: SharedEntityType;
  entityId: string;
  newOwnerId: string;
  requesterRole: string;
}

@Injectable()
export class TransferEntityUseCase {
  constructor(private readonly repo: SharedEntitiesRepository) {}

  async execute(input: TransferEntityInput): Promise<Either<Error, void>> {
    if (input.requesterRole !== "admin") {
      return left(new Error("Apenas administradores podem transferir entidades"));
    }

    if (!SHARED_ENTITY_TYPES.includes(input.entityType)) {
      return left(new Error(`Tipo inválido: ${input.entityType}`));
    }

    await this.repo.transferOwnership(input.entityType, input.entityId, input.newOwnerId);
    return right(undefined);
  }
}
