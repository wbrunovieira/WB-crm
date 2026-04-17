import { randomUUID } from "node:crypto";

export class UniqueEntityID {
  private readonly _value: string;

  get value(): string {
    return this._value;
  }

  constructor(value?: string) {
    this._value = value ?? randomUUID();
  }

  equals(id: UniqueEntityID): boolean {
    return this._value === id._value;
  }

  toString(): string {
    return this._value;
  }
}
