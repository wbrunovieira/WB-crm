import { Either, left, right } from "@/core/either";

export class CadenceName {
  private constructor(private readonly _value: string) {}
  get value(): string { return this._value; }
  toString(): string { return this._value; }

  static create(raw: string): Either<Error, CadenceName> {
    const name = raw.trim();
    if (!name) return left(new Error("Nome da cadência não pode ser vazio"));
    if (name.length > 100) return left(new Error("Nome da cadência não pode ter mais de 100 caracteres"));
    return right(new CadenceName(name));
  }
}
