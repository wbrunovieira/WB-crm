import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { EmailVerifierPort } from "@/domain/integrations/email/application/ports/email-verifier.port";
import { ContactsRepository } from "@/domain/contacts/application/repositories/contacts.repository";

export interface BatchVerifyContactEmailsInput {
  ownerId: string;
  delayMs?: number;
  onProgress?: (progress: BatchVerifyContactEmailsProgress) => void;
}

export interface BatchVerifyContactEmailsProgress {
  current: number;
  total: number;
  contactId: string;
  name: string;
  valid: boolean | null;
  status?: string;
  reason?: string;
  error?: string;
}

export interface BatchVerifyContactEmailsResult {
  total: number;
  checked: number;
  valid: number;
  invalid: number;
  skipped: number;
  errors: number;
}

type Output = Either<Error, BatchVerifyContactEmailsResult>;

@Injectable()
export class BatchVerifyContactEmailsUseCase {
  constructor(
    private readonly emailVerifier: EmailVerifierPort,
    private readonly contactsRepo: ContactsRepository,
  ) {}

  async execute(input: BatchVerifyContactEmailsInput): Promise<Output> {
    const contacts = await this.contactsRepo.findByOwnerId(input.ownerId);

    if (contacts.length === 0) {
      return left(new Error(`Nenhum contato encontrado para o proprietário: ${input.ownerId}`));
    }

    const delayMs = input.delayMs ?? 800;

    const result: BatchVerifyContactEmailsResult = {
      total: contacts.length,
      checked: 0,
      valid: 0,
      invalid: 0,
      skipped: 0,
      errors: 0,
    };

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];

      if (!contact.email) {
        result.skipped++;
        input.onProgress?.({
          current: i + 1,
          total: contacts.length,
          contactId: contact.id.toString(),
          name: contact.name,
          valid: null,
        });
        continue;
      }

      try {
        const verificationResult = await this.emailVerifier.verify(contact.email);

        await this.contactsRepo.saveEmailVerification(contact.id.toString(), {
          emailVerified: verificationResult.valid,
          emailVerifiedAt: new Date(),
          emailVerificationStatus: verificationResult.status,
          emailVerificationReason: verificationResult.reason,
        });

        result.checked++;
        if (verificationResult.valid) result.valid++;
        else result.invalid++;

        input.onProgress?.({
          current: i + 1,
          total: contacts.length,
          contactId: contact.id.toString(),
          name: contact.name,
          valid: verificationResult.valid,
          status: verificationResult.status,
          reason: verificationResult.reason,
        });
      } catch (err) {
        result.errors++;
        input.onProgress?.({
          current: i + 1,
          total: contacts.length,
          contactId: contact.id.toString(),
          name: contact.name,
          valid: null,
          error: err instanceof Error ? err.message : "Erro desconhecido",
        });
      }

      if (i < contacts.length - 1 && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return right(result);
  }
}
