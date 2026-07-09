import { left, right, type Either } from "@/core/either";

export class InvalidCnpjError extends Error {
  constructor(raw: string) {
    super(`CNPJ inválido: "${raw}"`);
    this.name = "InvalidCnpjError";
  }
}

/**
 * Value Object de CNPJ. Valida os dígitos verificadores e aceita tanto o CNPJ
 * numérico tradicional quanto o **alfanumérico** da Receita (Nota Técnica
 * COCAD/SUARA/RFB nº 49/2024, jul/2026): 12 posições alfanuméricas (A-Z, 0-9) +
 * 2 dígitos verificadores numéricos. No DV, cada caractere vale (ASCII − 48):
 * '0'-'9' → 0-9, 'A'=17 … 'Z'=42. Guarda o valor normalizado (14 posições,
 * sem pontuação, maiúsculo).
 */
export class Cnpj {
  private constructor(private readonly _value: string) {}

  static normalize(raw: string): string {
    return raw.replace(/[^0-9A-Za-z]/g, "").toUpperCase().padStart(14, "0");
  }

  static isValid(raw: string | null | undefined): boolean {
    const d = Cnpj.normalize((raw ?? "").trim());

    // 12 posições alfanuméricas + 2 dígitos verificadores numéricos.
    if (!/^[0-9A-Z]{12}\d{2}$/.test(d)) return false;
    // Rejeita CNPJ numérico com todos os dígitos iguais.
    if (/^(\d)\1{13}$/.test(d)) return false;

    const charValue = (ch: string) => ch.charCodeAt(0) - 48;
    const calcDigit = (chars: string, weights: number[]) => {
      const sum = chars.split("").reduce((acc, ch, i) => acc + charValue(ch) * weights[i], 0);
      const remainder = sum % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };

    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    return (
      parseInt(d[12], 10) === calcDigit(d.slice(0, 12), w1) &&
      parseInt(d[13], 10) === calcDigit(d.slice(0, 13), w2)
    );
  }

  static create(raw: string | null | undefined): Either<InvalidCnpjError, Cnpj> {
    const trimmed = (raw ?? "").trim();
    if (!Cnpj.isValid(trimmed)) return left(new InvalidCnpjError(trimmed));
    return right(new Cnpj(Cnpj.normalize(trimmed)));
  }

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }

  equals(other: Cnpj): boolean {
    return this._value === other._value;
  }
}
