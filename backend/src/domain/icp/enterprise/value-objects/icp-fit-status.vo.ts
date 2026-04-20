import { Either, left, right } from "@/core/either";

export type ICPFitStatusValue = "ideal" | "partial" | "out_of_icp";

export class ICPFitStatus {
  private constructor(private readonly _value: ICPFitStatusValue) {}

  get value(): ICPFitStatusValue { return this._value; }

  static create(raw: string): Either<Error, ICPFitStatus> {
    const valid: ICPFitStatusValue[] = ["ideal", "partial", "out_of_icp"];
    if (!valid.includes(raw as ICPFitStatusValue)) {
      return left(new Error(`ICPFitStatus inválido: ${raw}`));
    }
    return right(new ICPFitStatus(raw as ICPFitStatusValue));
  }

  toString(): string { return this._value; }
}
