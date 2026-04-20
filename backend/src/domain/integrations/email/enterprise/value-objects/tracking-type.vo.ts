import { Either, left, right } from "@/core/either";

export class InvalidTrackingTypeError extends Error {
  constructor(raw: string) {
    super(`Invalid TrackingType: "${raw}" — must be "open" or "click"`);
    this.name = "InvalidTrackingTypeError";
  }
}

export type TrackingTypeValue = "open" | "click";
const VALID_TYPES: TrackingTypeValue[] = ["open", "click"];

export class TrackingType {
  private constructor(private readonly _value: TrackingTypeValue) {}

  static create(raw: string): Either<InvalidTrackingTypeError, TrackingType> {
    if (!raw || raw.trim().length === 0) {
      return left(new InvalidTrackingTypeError(raw));
    }

    const normalized = raw.trim().toLowerCase();

    if (!VALID_TYPES.includes(normalized as TrackingTypeValue)) {
      return left(new InvalidTrackingTypeError(raw));
    }

    return right(new TrackingType(normalized as TrackingTypeValue));
  }

  get value(): TrackingTypeValue {
    return this._value;
  }

  toString(): string {
    return this._value;
  }
}
