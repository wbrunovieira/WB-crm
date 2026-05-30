import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { OperationsRepository, OperationsEntityType, OperationsSearchResult } from "../repositories/operations.repository";
import { OperationsEntityType as OperationsEntityTypeVO, InvalidEntityTypeError } from "../../enterprise/value-objects/operations-entity-type.vo";

export class OperationsEntityNotFoundError extends Error { name = "OperationsEntityNotFoundError"; }
export class OperationsForbiddenError extends Error { name = "OperationsForbiddenError"; }
// Re-export para consumidores existentes (controller mapeia por mensagem; specs por name).
export { InvalidEntityTypeError };

@Injectable()
export class TransferToOperationsUseCase {
  constructor(private readonly repo: OperationsRepository) {}

  async execute(input: { entityType: string; entityId: string; requesterId: string; requesterRole: string }): Promise<Either<Error, { entityId: string; transferredAt: Date }>> {
    const typeResult = OperationsEntityTypeVO.create(input.entityType);
    if (typeResult.isLeft()) return left(typeResult.value);
    const entityType: OperationsEntityType = typeResult.value.value;

    const entity = await this.repo.findById(entityType, input.entityId);
    if (!entity) return left(new OperationsEntityNotFoundError(`${entityType} não encontrado`));
    if (input.requesterRole !== "admin" && entity.ownerId !== input.requesterId) {
      return left(new OperationsForbiddenError("Acesso negado"));
    }

    const transferredAt = new Date();
    await this.repo.transferToOperations(entityType, input.entityId, transferredAt);
    return right({ entityId: input.entityId, transferredAt });
  }
}

@Injectable()
export class SearchEntitiesForTransferUseCase {
  constructor(private readonly repo: OperationsRepository) {}

  async execute(query: string): Promise<Either<never, { results: OperationsSearchResult[] }>> {
    const results = await this.repo.search(query.trim());
    return right({ results });
  }
}

@Injectable()
export class RevertFromOperationsUseCase {
  constructor(private readonly repo: OperationsRepository) {}

  async execute(input: { entityType: string; entityId: string; requesterId: string; requesterRole: string }): Promise<Either<Error, void>> {
    const typeResult = OperationsEntityTypeVO.create(input.entityType);
    if (typeResult.isLeft()) return left(typeResult.value);
    const entityType: OperationsEntityType = typeResult.value.value;

    const entity = await this.repo.findById(entityType, input.entityId);
    if (!entity) return left(new OperationsEntityNotFoundError(`${entityType} não encontrado`));
    if (input.requesterRole !== "admin" && entity.ownerId !== input.requesterId) {
      return left(new OperationsForbiddenError("Acesso negado"));
    }

    await this.repo.revertFromOperations(entityType, input.entityId);
    return right(undefined);
  }
}
