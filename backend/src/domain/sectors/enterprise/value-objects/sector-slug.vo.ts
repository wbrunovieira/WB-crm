import { Either, left, right } from "@/core/either";

export class InvalidSectorSlugError extends Error {
  constructor(msg: string) { super(msg); this.name = "InvalidSectorSlugError"; }
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class SectorSlug {
  private constructor(private readonly value: string) {}

  static create(raw: string): Either<InvalidSectorSlugError, SectorSlug> {
    if (!raw) return left(new InvalidSectorSlugError("Slug não pode ser vazio"));
    if (!SLUG_REGEX.test(raw)) return left(new InvalidSectorSlugError("Slug deve conter apenas letras minúsculas, números e hifens"));
    return right(new SectorSlug(raw));
  }

  static fromName(name: string): Either<InvalidSectorSlugError, SectorSlug> {
    const slug = name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return SectorSlug.create(slug);
  }

  toString(): string { return this.value; }
}
