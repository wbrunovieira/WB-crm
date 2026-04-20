import { Either, left, right } from "@/core/either";

export type LeadCadenceStatusValue = "active" | "paused" | "completed" | "cancelled";

export class LeadCadenceStatus {
  private constructor(private readonly _value: LeadCadenceStatusValue) {}
  get value(): LeadCadenceStatusValue { return this._value; }
  toString(): string { return this._value; }

  static create(raw: string): Either<Error, LeadCadenceStatus> {
    const valid: LeadCadenceStatusValue[] = ["active", "paused", "completed", "cancelled"];
    if (!valid.includes(raw as LeadCadenceStatusValue)) {
      return left(new Error(`Status de cadência do lead inválido: ${raw}`));
    }
    return right(new LeadCadenceStatus(raw as LeadCadenceStatusValue));
  }

  static active(): LeadCadenceStatus { return new LeadCadenceStatus("active"); }
}
