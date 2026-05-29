import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { EmailVerifierPort } from "../ports/email-verifier.port";
import { LeadContactsRepository } from "@/domain/leads/application/repositories/lead-contacts.repository";
import { EmailVerification } from "../../enterprise/value-objects/email-verification.vo";

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
    private readonly leadContacts: LeadContactsRepository,
  ) {}

  async execute(input: VerifyLeadContactEmailInput): Promise<Output> {
    const leadContact = await this.leadContacts.findById(input.leadContactId);

    if (!leadContact) {
      return left(new Error("LeadContact não encontrado"));
    }

    if (!leadContact.email) {
      return left(new Error("LeadContact não possui email"));
    }

    let result;
    try {
      result = await this.emailVerifier.verify(leadContact.email);
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
      await this.leadContacts.saveEmailVerification(leadContact.id, {
        valid: verification.valid,
        status: verification.status,
        reason: verification.reason,
        verifiedAt: verification.verifiedAt,
      });
    } catch (err) {
      return left(err instanceof Error ? err : new Error(String(err)));
    }

    return right({
      leadContactId: leadContact.id,
      email: leadContact.email,
      valid: verification.valid,
      status: verification.status,
      reason: verification.reason,
    });
  }
}
