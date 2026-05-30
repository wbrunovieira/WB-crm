import { left, right, type Either } from "@/core/either";

export class ContactName {
  private constructor(private readonly _value: string) {}

  static create(raw: string | undefined | null): Either<Error, ContactName> {
    const trimmed = (raw ?? "").trim();
    if (!trimmed) {
      return left(new Error("Nome é obrigatório"));
    }
    return right(new ContactName(trimmed));
  }

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }

  equals(other: ContactName): boolean {
    return this._value === other._value;
  }
}
