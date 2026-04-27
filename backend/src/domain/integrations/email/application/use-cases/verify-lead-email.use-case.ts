import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { EmailVerifierPort } from "../ports/email-verifier.port";
import { LeadsRepository } from "@/domain/leads/application/repositories/leads.repository";

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

    if (!lead.email) {
      return left(new Error("Lead não possui email"));
    }

    const verificationResult = await this.emailVerifier.verify(lead.email);

    await this.leadsRepo.saveEmailVerification(lead.id.toString(), {
      emailVerified: verificationResult.valid,
      emailVerifiedAt: new Date(),
      emailVerificationStatus: verificationResult.status,
      emailVerificationReason: verificationResult.reason,
    });

    return right({
      leadId: lead.id.toString(),
      email: lead.email,
      valid: verificationResult.valid,
      status: verificationResult.status,
      reason: verificationResult.reason,
    });
  }
}
