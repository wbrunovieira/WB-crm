import { left, right, type Either } from "@/core/either";

export class OrganizationName {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(raw: string | undefined | null): Either<Error, OrganizationName> {
    const trimmed = (raw ?? "").trim();
    if (!trimmed) {
      return left(new Error("Nome da organização é obrigatório"));
    }
    return right(new OrganizationName(trimmed));
  }

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }

  equals(other: OrganizationName): boolean {
    return this._value === other._value;
  }
}
