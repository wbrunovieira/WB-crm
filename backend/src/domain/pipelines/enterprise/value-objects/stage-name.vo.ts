import { left, right, type Either } from "@/core/either";

export class StageName {
  private constructor(private readonly _value: string) {}

  static create(raw: string | undefined | null): Either<Error, StageName> {
    const trimmed = (raw ?? "").trim();
    if (!trimmed) {
      return left(new Error("Nome do estágio é obrigatório"));
    }
    return right(new StageName(trimmed));
  }

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }

  equals(other: StageName): boolean {
    return this._value === other._value;
  }
}
