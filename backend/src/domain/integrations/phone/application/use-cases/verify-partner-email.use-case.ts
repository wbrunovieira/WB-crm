import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { EmailVerifierPort } from "@/domain/integrations/email/application/ports/email-verifier.port";
import { PartnersRepository } from "@/domain/partners/application/repositories/partners.repository";

export interface VerifyPartnerEmailInput {
  partnerId: string;
  requesterId: string;
  requesterRole: string;
}

export interface VerifyPartnerEmailResult {
  partnerId: string;
  email: string;
  valid: boolean;
  status: string;
  reason: string;
}

type Output = Either<Error, VerifyPartnerEmailResult>;

@Injectable()
export class VerifyPartnerEmailUseCase {
  constructor(
    private readonly emailVerifier: EmailVerifierPort,
    private readonly partnersRepo: PartnersRepository,
  ) {}

  async execute(input: VerifyPartnerEmailInput): Promise<Output> {
    const partner = await this.partnersRepo.findByIdRaw(input.partnerId);
    if (!partner) {
      return left(new Error("Parceiro não encontrado"));
    }

    // Data isolation: only the owner (or an admin) may verify a partner's email.
    if (input.requesterRole !== "admin" && partner.ownerId !== input.requesterId) {
      return left(new Error("Não autorizado"));
    }

    if (!partner.email) {
      return left(new Error("Parceiro não possui email"));
    }

    const verificationResult = await this.emailVerifier.verify(partner.email);

    await this.partnersRepo.saveEmailVerification(partner.id.toString(), {
      emailVerified: verificationResult.valid,
      emailVerifiedAt: new Date(),
      emailVerificationStatus: verificationResult.status,
      emailVerificationReason: verificationResult.reason,
    });

    return right({
      partnerId: partner.id.toString(),
      email: partner.email,
      valid: verificationResult.valid,
      status: verificationResult.status,
      reason: verificationResult.reason,
    });
  }
}
