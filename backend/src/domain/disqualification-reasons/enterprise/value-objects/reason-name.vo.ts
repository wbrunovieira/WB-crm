import { Either, left, right } from "@/core/either";

export class ReasonNameError extends Error { name = "ReasonNameError"; }

export class ReasonName {
  private constructor(private readonly _value: string) {}
  get value(): string { return this._value; }

  static create(raw: string): Either<ReasonNameError, ReasonName> {
    const trimmed = raw.trim();
    if (!trimmed) return left(new ReasonNameError("Nome do motivo não pode ser vazio"));
    if (trimmed.length > 100) return left(new ReasonNameError("Nome do motivo não pode ter mais de 100 caracteres"));
    return right(new ReasonName(trimmed));
  }
}
