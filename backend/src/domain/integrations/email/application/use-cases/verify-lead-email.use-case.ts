import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { EmailVerifierPort } from "../ports/email-verifier.port";
import { LeadsRepository } from "@/domain/leads/application/repositories/leads.repository";
import { EmailVerification } from "../../enterprise/value-objects/email-verification.vo";

export interface VerifyLeadEmailInput {
  leadId: string;
  requesterId: string;
  requesterRole: string;
}

export interface VerifyLeadEmailResult {
  leadId: string;
  email: string;
  valid: boolean;
  status: string;
  reason: string;
}

type Output = Either<Error, VerifyLeadEmailResult>;

@Injectable()
export class VerifyLeadEmailUseCase {
  constructor(
    private readonly emailVerifier: EmailVerifierPort,
    private readonly leadsRepo: LeadsRepository,
  ) {}

  async execute(input: VerifyLeadEmailInput): Promise<Output> {
    const lead = await this.leadsRepo.findByIdRaw(input.leadId);
    if (!lead) {
      return left(new Error("Lead não encontrado"));
    }

    // Data isolation: only the owner (or an admin) may verify a lead's email.
    if (input.requesterRole !== "admin" && lead.ownerId !== input.requesterId) {
      return left(new Error("Não autorizado"));
    }

    if (!lead.email) {
      return left(new Error("Lead não possui email"));
    }

    let result;
    try {
      result = await this.emailVerifier.verify(lead.email);
    } catch (err) {
      return left(err instanceof Error ? err : new Error(String(err)));
    }

    // VO owns the invariant (known status + non-empty reason). Use case only orchestrates.
    const verificationOrError = EmailVerification.create({
      valid: result.valid,
      status: result.status,
      reason: result.reason,
    });
    if (verificationOrError.isLeft()) {
      return left(verificationOrError.value);
    }
    const verification = verificationOrError.value;

    try {
      await this.leadsRepo.saveEmailVerification(lead.id.toString(), {
        emailVerified: verification.valid,
        emailVerifiedAt: verification.verifiedAt,
        emailVerificationStatus: verification.status,
        emailVerificationReason: verification.reason,
      });
    } catch (err) {
      return left(err instanceof Error ? err : new Error(String(err)));
    }

    return right({
      leadId: lead.id.toString(),
      email: lead.email,
      valid: verification.valid,
      status: verification.status,
      reason: verification.reason,
    });
  }
}
