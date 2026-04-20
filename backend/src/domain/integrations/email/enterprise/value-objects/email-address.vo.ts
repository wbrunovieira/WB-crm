import { Either, left, right } from "@/core/either";

export class InvalidEmailAddressError extends Error {
  constructor(raw: string) {
    super(`Invalid EmailAddress: "${raw}"`);
    this.name = "InvalidEmailAddressError";
  }
}

// RFC 5322 basic validation: must have @, local part, domain with at least one dot
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class EmailAddress {
  private constructor(private readonly _value: string) {}

  static create(raw: string): Either<InvalidEmailAddressError, EmailAddress> {
    if (!raw || raw.trim().length === 0) {
      return left(new InvalidEmailAddressError(raw));
    }

    const normalized = raw.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalized)) {
      return left(new InvalidEmailAddressError(raw));
    }

    // Must have an @ sign
    const atIndex = normalized.indexOf("@");
    if (atIndex <= 0) {
      return left(new InvalidEmailAddressError(raw));
    }

    // Domain must have a TLD (dot after @)
    const domain = normalized.slice(atIndex + 1);
    if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) {
      return left(new InvalidEmailAddressError(raw));
    }

    return right(new EmailAddress(normalized));
  }

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }
}
