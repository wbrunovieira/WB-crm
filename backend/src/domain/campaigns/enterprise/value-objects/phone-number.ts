import { left, right, type Either } from "@/core/either";

export class PhoneNumber {
  private readonly _value: string; // sempre E.164 sem "+" ex: "5511999998888"

  private constructor(value: string) {
    this._value = value;
  }

  static create(raw: string): Either<Error, PhoneNumber> {
    if (!raw) return left(new Error("Número de telefone não pode ser vazio"));

    const digits = raw.replace(/\D/g, "");

    if (digits.length < 10) {
      return left(new Error(`Número inválido: "${raw}" — mínimo 10 dígitos`));
    }

    // Se não começa com código de país, assume Brasil (55)
    const normalized = digits.startsWith("55") && digits.length >= 12
      ? digits
      : `55${digits}`;

    return right(new PhoneNumber(normalized));
  }

  toString(): string {
    return this._value;
  }

  equals(other: PhoneNumber): boolean {
    return this._value === other._value;
  }
}
