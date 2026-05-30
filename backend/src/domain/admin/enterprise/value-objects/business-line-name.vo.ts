import { left, right, type Either } from "@/core/either";

export class BusinessLineName {
  private constructor(private readonly _value: string) {}

  static create(raw: string | undefined | null): Either<Error, BusinessLineName> {
    const trimmed = (raw ?? "").trim();
    if (!trimmed) {
      return left(new Error("Nome da linha de negócio é obrigatório"));
    }
    return right(new BusinessLineName(trimmed));
  }

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }

  equals(other: BusinessLineName): boolean {
    return this._value === other._value;
  }
}
