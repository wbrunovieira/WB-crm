import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { EmailVerifierPort } from "../ports/email-verifier.port";
import { PrismaService } from "@/infra/database/prisma.service";

export interface VerifyLeadContactEmailInput {
  leadContactId: string;
  requesterId: string;
}

export interface VerifyLeadContactEmailResult {
  leadContactId: string;
  email: string;
  valid: boolean;
  status: string;
  reason: string;
}

type Output = Either<Error, VerifyLeadContactEmailResult>;

@Injectable()
export class VerifyLeadContactEmailUseCase {
  constructor(
    private readonly emailVerifier: EmailVerifierPort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: VerifyLeadContactEmailInput): Promise<Output> {
    const leadContact = await this.prisma.leadContact.findUnique({
      where: { id: input.leadContactId },
      select: { id: true, email: true },
    });

    if (!leadContact) {
      return left(new Error("LeadContact não encontrado"));
    }

    if (!leadContact.email) {
      return left(new Error("LeadContact não possui email"));
    }

    const verificationResult = await this.emailVerifier.verify(leadContact.email);

    await this.prisma.leadContact.update({
      where: { id: input.leadContactId },
      data: {
        emailVerified: verificationResult.valid,
        emailVerifiedAt: new Date(),
        emailVerificationStatus: verificationResult.status,
        emailVerificationReason: verificationResult.reason,
      },
    });

    return right({
      leadContactId: leadContact.id,
      email: leadContact.email,
      valid: verificationResult.valid,
      status: verificationResult.status,
      reason: verificationResult.reason,
    });
  }
}
