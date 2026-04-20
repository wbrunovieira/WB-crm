import { Either, left, right } from "@/core/either";

export type ProposalStatusValue = "draft" | "sent" | "accepted" | "rejected";

export class ProposalStatusError extends Error { name = "ProposalStatusError"; }

export class ProposalStatus {
  private constructor(private readonly _value: ProposalStatusValue) {}
  get value(): ProposalStatusValue { return this._value; }

  static create(raw: string): Either<ProposalStatusError, ProposalStatus> {
    const valid: ProposalStatusValue[] = ["draft", "sent", "accepted", "rejected"];
    if (!valid.includes(raw as ProposalStatusValue)) {
      return left(new ProposalStatusError(`Status inválido: ${raw}. Use: draft, sent, accepted, rejected`));
    }
    return right(new ProposalStatus(raw as ProposalStatusValue));
  }

  static draft(): ProposalStatus { return new ProposalStatus("draft"); }
  static sent(): ProposalStatus { return new ProposalStatus("sent"); }
}
