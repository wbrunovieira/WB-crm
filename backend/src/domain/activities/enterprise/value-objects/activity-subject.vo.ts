import { left, right, type Either } from "@/core/either";

export class ActivitySubject {
  private constructor(private readonly _value: string) {}

  static create(raw: string | undefined | null): Either<Error, ActivitySubject> {
    const trimmed = (raw ?? "").trim();
    if (!trimmed) {
      return left(new Error("Assunto da atividade é obrigatório"));
    }
    return right(new ActivitySubject(trimmed));
  }

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }

  equals(other: ActivitySubject): boolean {
    return this._value === other._value;
  }
}
