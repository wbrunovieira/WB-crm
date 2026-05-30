import { left, right, type Either } from "@/core/either";

export class ProductName {
  private constructor(private readonly _value: string) {}

  static create(raw: string | undefined | null): Either<Error, ProductName> {
    const trimmed = (raw ?? "").trim();
    if (!trimmed) {
      return left(new Error("Nome do produto é obrigatório"));
    }
    return right(new ProductName(trimmed));
  }

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }

  equals(other: ProductName): boolean {
    return this._value === other._value;
  }
}
