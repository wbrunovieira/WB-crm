import { left, right, type Either } from "@/core/either";

export class PartnerName {
  private constructor(private readonly _value: string) {}

  static create(raw: string | undefined | null): Either<Error, PartnerName> {
    const trimmed = (raw ?? "").trim();
    if (!trimmed) {
      return left(new Error("Nome do parceiro é obrigatório"));
    }
    return right(new PartnerName(trimmed));
  }

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }

  equals(other: PartnerName): boolean {
    return this._value === other._value;
  }
}
