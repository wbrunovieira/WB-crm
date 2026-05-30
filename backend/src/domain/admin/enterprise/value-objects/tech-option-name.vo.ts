import { left, right, type Either } from "@/core/either";

export class TechOptionName {
  private constructor(private readonly _value: string) {}

  static create(raw: string | undefined | null): Either<Error, TechOptionName> {
    const trimmed = (raw ?? "").trim();
    if (!trimmed) {
      return left(new Error("Nome é obrigatório"));
    }
    return right(new TechOptionName(trimmed));
  }

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }

  equals(other: TechOptionName): boolean {
    return this._value === other._value;
  }
}
