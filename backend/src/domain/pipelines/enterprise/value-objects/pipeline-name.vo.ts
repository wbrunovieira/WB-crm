import { left, right, type Either } from "@/core/either";

export class PipelineName {
  private constructor(private readonly _value: string) {}

  static create(raw: string | undefined | null): Either<Error, PipelineName> {
    const trimmed = (raw ?? "").trim();
    if (!trimmed) {
      return left(new Error("Nome do pipeline é obrigatório"));
    }
    return right(new PipelineName(trimmed));
  }

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }

  equals(other: PipelineName): boolean {
    return this._value === other._value;
  }
}
