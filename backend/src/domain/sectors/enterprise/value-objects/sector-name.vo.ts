import { Either, left, right } from "@/core/either";

export class InvalidSectorNameError extends Error {
  constructor(msg: string) { super(msg); this.name = "InvalidSectorNameError"; }
}

export class SectorName {
  private constructor(private readonly value: string) {}

  static create(raw: string): Either<InvalidSectorNameError, SectorName> {
    const trimmed = raw?.trim() ?? "";
    if (!trimmed) return left(new InvalidSectorNameError("Nome não pode ser vazio"));
    if (trimmed.length > 100) return left(new InvalidSectorNameError("Nome deve ter no máximo 100 caracteres"));
    return right(new SectorName(trimmed));
  }

  toString(): string { return this.value; }
}
