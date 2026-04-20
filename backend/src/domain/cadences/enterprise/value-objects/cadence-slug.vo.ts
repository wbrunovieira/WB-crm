import { Either, left, right } from "@/core/either";

export class CadenceSlug {
  private constructor(private readonly _value: string) {}
  get value(): string { return this._value; }
  toString(): string { return this._value; }

  static create(raw: string): Either<Error, CadenceSlug> {
    const slug = raw.trim();
    if (!slug) return left(new Error("Slug da cadência não pode ser vazio"));
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return left(new Error("Slug inválido: use apenas letras minúsculas, números e hífens"));
    return right(new CadenceSlug(slug));
  }

  static fromName(name: string): CadenceSlug {
    const slug = name
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, "");
    return new CadenceSlug(slug || "cadencia");
  }
}
