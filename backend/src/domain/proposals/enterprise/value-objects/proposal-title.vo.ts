import { Either, left, right } from "@/core/either";

export class ProposalTitleError extends Error { name = "ProposalTitleError"; }

export class ProposalTitle {
  private constructor(private readonly _value: string) {}
  get value(): string { return this._value; }

  static create(raw: string): Either<ProposalTitleError, ProposalTitle> {
    const trimmed = raw.trim();
    if (!trimmed) return left(new ProposalTitleError("Título da proposta não pode ser vazio"));
    if (trimmed.length > 200) return left(new ProposalTitleError("Título não pode ter mais de 200 caracteres"));
    return right(new ProposalTitle(trimmed));
  }
}
