import { left, right, type Either } from "@/core/either";

export class BusinessName {
  private constructor(private readonly _value: string) {}

  static create(raw: string | undefined | null): Either<Error, BusinessName> {
    const trimmed = (raw ?? "").trim();
    if (!trimmed) {
      return left(new Error("Nome da empresa é obrigatório"));
    }
    return right(new BusinessName(trimmed));
  }

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }

  equals(other: BusinessName): boolean {
    return this._value === other._value;
  }
}
