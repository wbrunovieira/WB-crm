import { left, right, type Either } from "@/core/either";
import type { OperationsEntityType as OperationsEntityTypeValue } from "../../application/repositories/operations.repository";

export class InvalidEntityTypeError extends Error {
  name = "InvalidEntityTypeError";
}

const VALID_ENTITY_TYPES: OperationsEntityTypeValue[] = ["lead", "organization"];

/**
 * Tipo de entidade que pode ir/voltar de Operações.
 * Centraliza a validação de enum que estava inline (validateType) no use case.
 */
export class OperationsEntityType {
  private constructor(private readonly _value: OperationsEntityTypeValue) {}

  static create(raw: string): Either<InvalidEntityTypeError, OperationsEntityType> {
    if (!VALID_ENTITY_TYPES.includes(raw as OperationsEntityTypeValue)) {
      return left(new InvalidEntityTypeError(`Tipo de entidade inválido: ${raw}. Use: lead ou organization`));
    }
    return right(new OperationsEntityType(raw as OperationsEntityTypeValue));
  }

  get value(): OperationsEntityTypeValue {
    return this._value;
  }

  toString(): string {
    return this._value;
  }
}
