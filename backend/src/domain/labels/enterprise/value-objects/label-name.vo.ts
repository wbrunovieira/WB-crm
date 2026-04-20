import { Either, left, right } from "@/core/either";

export class InvalidLabelNameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidLabelNameError";
  }
}

export class LabelName {
  private constructor(private readonly value: string) {}

  static create(raw: string): Either<InvalidLabelNameError, LabelName> {
    const trimmed = raw?.trim() ?? "";
    if (!trimmed) return left(new InvalidLabelNameError("Nome não pode ser vazio"));
    if (trimmed.length > 50) return left(new InvalidLabelNameError("Nome deve ter no máximo 50 caracteres"));
    return right(new LabelName(trimmed));
  }

  toString(): string {
    return this.value;
  }
}
