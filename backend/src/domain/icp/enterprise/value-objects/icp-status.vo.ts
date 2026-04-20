import { Either, left, right } from "@/core/either";

export type ICPStatusValue = "draft" | "active" | "archived";

export class ICPStatus {
  private constructor(private readonly _value: ICPStatusValue) {}

  get value(): ICPStatusValue { return this._value; }

  static create(raw: string): Either<Error, ICPStatus> {
    const valid: ICPStatusValue[] = ["draft", "active", "archived"];
    if (!valid.includes(raw as ICPStatusValue)) {
      return left(new Error(`ICPStatus inválido: ${raw}`));
    }
    return right(new ICPStatus(raw as ICPStatusValue));
  }

  static draft(): ICPStatus { return new ICPStatus("draft"); }
  static active(): ICPStatus { return new ICPStatus("active"); }
  static archived(): ICPStatus { return new ICPStatus("archived"); }

  toString(): string { return this._value; }
}
