import { Either, left, right } from "@/core/either";

export class InvalidHexColorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidHexColorError";
  }
}

const HEX_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export class HexColor {
  private constructor(private readonly value: string) {}

  static create(raw: string): Either<InvalidHexColorError, HexColor> {
    if (!raw) return left(new InvalidHexColorError("Cor não pode ser vazia"));
    if (!HEX_REGEX.test(raw)) return left(new InvalidHexColorError("Cor deve ser um hexadecimal válido (ex: #FF5733)"));
    return right(new HexColor(raw.toUpperCase()));
  }

  toString(): string {
    return this.value;
  }
}
