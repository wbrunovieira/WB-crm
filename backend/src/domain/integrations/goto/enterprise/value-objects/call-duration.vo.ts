import { Either, left, right } from "@/core/either";

export class CallDuration {
  private constructor(private readonly _value: number) {}

  static create(seconds: number): Either<Error, CallDuration> {
    if (seconds < 0) {
      return left(new Error(`CallDuration must be non-negative, got: ${seconds}`));
    }
    return right(new CallDuration(seconds));
  }

  get value(): number {
    return this._value;
  }

  format(): string {
    const m = Math.floor(this._value / 60);
    const s = this._value % 60;
    if (m === 0) return `${s}s`;
    return `${m}min ${s}s`;
  }
}
