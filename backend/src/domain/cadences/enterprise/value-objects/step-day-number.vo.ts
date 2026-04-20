import { Either, left, right } from "@/core/either";

export class StepDayNumber {
  private constructor(private readonly _value: number) {}
  get value(): number { return this._value; }

  static create(raw: number): Either<Error, StepDayNumber> {
    if (!Number.isInteger(raw) || raw < 1) {
      return left(new Error("Dia do step deve ser um inteiro maior ou igual a 1"));
    }
    if (raw > 365) {
      return left(new Error("Dia do step não pode exceder 365"));
    }
    return right(new StepDayNumber(raw));
  }
}
