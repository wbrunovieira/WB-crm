import { Either, left, right } from "@/core/either";

export class InvalidEmailTrackingTokenError extends Error {
  constructor(raw: string, reason: string) {
    super(`Invalid EmailTrackingToken: "${raw}" — ${reason}`);
    this.name = "InvalidEmailTrackingTokenError";
  }
}

const TOKEN_REGEX = /^[a-zA-Z0-9_-]{8,128}$/;

export class EmailTrackingToken {
  private constructor(private readonly _value: string) {}

  static create(rawToken: string): Either<InvalidEmailTrackingTokenError, EmailTrackingToken> {
    if (!rawToken || rawToken.trim().length === 0) {
      return left(new InvalidEmailTrackingTokenError(rawToken, "token must not be empty"));
    }

    const trimmed = rawToken.trim();

    if (!TOKEN_REGEX.test(trimmed)) {
      return left(
        new InvalidEmailTrackingTokenError(
          rawToken,
          "token must be 8-128 chars, alphanumeric with dashes or underscores",
        ),
      );
    }

    return right(new EmailTrackingToken(trimmed));
  }

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }
}
