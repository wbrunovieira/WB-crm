import { left, right, type Either } from "@/core/either";

export type CommLanguageCode = "pt" | "en" | "es" | "it";

/**
 * Communication language of a contact/entity — drives which localized version of a
 * mass email/campaign they receive. Extend SUPPORTED to add languages; DEFAULT ("pt")
 * is applied when unset so existing pt-only data keeps working.
 */
export class CommLanguage {
  static readonly SUPPORTED: CommLanguageCode[] = ["pt", "en", "es", "it"];
  static readonly DEFAULT_CODE: CommLanguageCode = "pt";

  private constructor(private readonly _value: CommLanguageCode) {}

  static create(raw: string | undefined | null): Either<Error, CommLanguage> {
    const normalized = (raw ?? "").trim().toLowerCase();
    if (!normalized) return right(CommLanguage.default());
    if (!CommLanguage.SUPPORTED.includes(normalized as CommLanguageCode)) {
      return left(new Error(`Idioma não suportado: ${raw}`));
    }
    return right(new CommLanguage(normalized as CommLanguageCode));
  }

  static default(): CommLanguage {
    return new CommLanguage(CommLanguage.DEFAULT_CODE);
  }

  get value(): CommLanguageCode {
    return this._value;
  }

  toString(): string {
    return this._value;
  }

  equals(other: CommLanguage): boolean {
    return this._value === other._value;
  }
}
