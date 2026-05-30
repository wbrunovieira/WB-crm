import { left, right, type Either } from "@/core/either";

export class DealTitle {
  private constructor(private readonly _value: string) {}

  static create(raw: string | undefined | null): Either<Error, DealTitle> {
    const trimmed = (raw ?? "").trim();
    if (!trimmed) {
      return left(new Error("Título do deal é obrigatório"));
    }
    return right(new DealTitle(trimmed));
  }

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }

  equals(other: DealTitle): boolean {
    return this._value === other._value;
  }
}
