import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { EmailVerifierPort } from "@/domain/integrations/email/application/ports/email-verifier.port";
import { ContactsRepository } from "@/domain/contacts/application/repositories/contacts.repository";

export interface VerifyContactEmailInput {
  contactId: string;
  requesterId: string;
}

export interface VerifyContactEmailResult {
  contactId: string;
  email: string;
  valid: boolean;
  status: string;
  reason: string;
}

type Output = Either<Error, VerifyContactEmailResult>;

@Injectable()
export class VerifyContactEmailUseCase {
  constructor(
    private readonly emailVerifier: EmailVerifierPort,
    private readonly contactsRepo: ContactsRepository,
  ) {}

  async execute(input: VerifyContactEmailInput): Promise<Output> {
    const contact = await this.contactsRepo.findById(input.contactId);
    if (!contact) {
      return left(new Error("Contato não encontrado"));
    }

    if (!contact.email) {
      return left(new Error("Contato não possui email"));
    }

    const verificationResult = await this.emailVerifier.verify(contact.email);

    await this.contactsRepo.saveEmailVerification(contact.id.toString(), {
      emailVerified: verificationResult.valid,
      emailVerifiedAt: new Date(),
      emailVerificationStatus: verificationResult.status,
      emailVerificationReason: verificationResult.reason,
    });

    return right({
      contactId: contact.id.toString(),
      email: contact.email,
      valid: verificationResult.valid,
      status: verificationResult.status,
      reason: verificationResult.reason,
    });
  }
}
