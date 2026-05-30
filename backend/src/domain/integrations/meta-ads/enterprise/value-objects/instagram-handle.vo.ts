import { left, right, type Either } from "@/core/either";

/**
 * Instagram handle — normaliza (trim + remove `@` iniciais) e valida não-vazio.
 * Centraliza a regra que estava inline em verify-lead-meta-ads e
 * batch-verify-lead-meta-ads, para os use cases serem orquestradores.
 */
export class InstagramHandle {
  private constructor(private readonly _value: string) {}

  static create(raw: string | undefined | null): Either<Error, InstagramHandle> {
    const handle = (raw ?? "").trim().replace(/^@+/, "").trim();
    if (!handle) {
      return left(new Error("Handle do Instagram inválido"));
    }
    return right(new InstagramHandle(handle));
  }

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }

  equals(other: InstagramHandle): boolean {
    return this._value === other._value;
  }
}
