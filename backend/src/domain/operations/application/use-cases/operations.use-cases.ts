import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { OperationsRepository, OperationsEntityType } from "../repositories/operations.repository";

export class OperationsEntityNotFoundError extends Error { name = "OperationsEntityNotFoundError"; }
export class OperationsForbiddenError extends Error { name = "OperationsForbiddenError"; }
export class InvalidEntityTypeError extends Error { name = "InvalidEntityTypeError"; }

const VALID_ENTITY_TYPES: OperationsEntityType[] = ["lead", "organization"];

function validateType(type: string): Either<InvalidEntityTypeError, OperationsEntityType> {
  if (!VALID_ENTITY_TYPES.includes(type as OperationsEntityType)) {
    return left(new InvalidEntityTypeError(`Tipo de entidade inválido: ${type}. Use: lead ou organization`));
  }
  return right(type as OperationsEntityType);
}

@Injectable()
export class TransferToOperationsUseCase {
  constructor(private readonly repo: OperationsRepository) {}

  async execute(input: { entityType: string; entityId: string; requesterId: string; requesterRole: string }): Promise<Either<Error, { entityId: string; transferredAt: Date }>> {
    const typeResult = validateType(input.entityType);
    if (typeResult.isLeft()) return left(typeResult.value);
    const entityType = typeResult.value as OperationsEntityType;

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
export class RevertFromOperationsUseCase {
  constructor(private readonly repo: OperationsRepository) {}

  async execute(input: { entityType: string; entityId: string; requesterId: string; requesterRole: string }): Promise<Either<Error, void>> {
    const typeResult = validateType(input.entityType);
    if (typeResult.isLeft()) return left(typeResult.value);
    const entityType = typeResult.value as OperationsEntityType;

    const entity = await this.repo.findById(entityType, input.entityId);
    if (!entity) return left(new OperationsEntityNotFoundError(`${entityType} não encontrado`));
    if (input.requesterRole !== "admin" && entity.ownerId !== input.requesterId) {
      return left(new OperationsForbiddenError("Acesso negado"));
    }

    await this.repo.revertFromOperations(entityType, input.entityId);
    return right(undefined);
  }
}
