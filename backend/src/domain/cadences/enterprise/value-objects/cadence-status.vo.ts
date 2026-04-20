import { Either, left, right } from "@/core/either";

export type CadenceStatusValue = "draft" | "active" | "archived";

export class CadenceStatus {
  private constructor(private readonly _value: CadenceStatusValue) {}
  get value(): CadenceStatusValue { return this._value; }
  toString(): string { return this._value; }

  static create(raw: string): Either<Error, CadenceStatus> {
    const valid: CadenceStatusValue[] = ["draft", "active", "archived"];
    if (!valid.includes(raw as CadenceStatusValue)) {
      return left(new Error(`Status de cadência inválido: ${raw}`));
    }
    return right(new CadenceStatus(raw as CadenceStatusValue));
  }

  static draft(): CadenceStatus { return new CadenceStatus("draft"); }
  static active(): CadenceStatus { return new CadenceStatus("active"); }
}
