import { Injectable } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { EmailVerifierPort } from "../ports/email-verifier.port";
import { LeadsRepository } from "@/domain/leads/application/repositories/leads.repository";
import { EmailVerification } from "../../enterprise/value-objects/email-verification.vo";

export interface BatchVerifyEmailsInput {
  sourceGroup: string;
  /** Requester identity — used to scope the batch to the requester's own leads. */
  requesterId: string;
  requesterRole: string;
  /** Delay in ms between individual checks to avoid overloading DNS (default: 800) */
  delayMs?: number;
  /** Callback fired after each lead is processed (for SSE progress) */
  onProgress?: (progress: BatchVerifyEmailsProgress) => void;
}

export interface BatchVerifyEmailsProgress {
  current: number;
  total: number;
  leadId: string;
  businessName: string;
  valid: boolean | null;
  status?: string;
  reason?: string;
  error?: string;
}

export interface BatchVerifyEmailsResult {
  total: number;
  checked: number;
  valid: number;
  invalid: number;
  skipped: number;
  errors: number;
}

type Output = Either<Error, BatchVerifyEmailsResult>;

@Injectable()
export class BatchVerifyEmailsUseCase {
  constructor(
    private readonly emailVerifier: EmailVerifierPort,
    private readonly leadsRepo: LeadsRepository,
  ) {}

  async execute(input: BatchVerifyEmailsInput): Promise<Output> {
    if (!input.sourceGroup?.trim()) {
      return left(new Error("sourceGroup é obrigatório"));
    }

    const allLeads = await this.leadsRepo.findBySourceGroup(input.sourceGroup.trim());

    // Data isolation: a non-admin only acts on their own leads within the group.
    const leads =
      input.requesterRole === "admin"
        ? allLeads
        : allLeads.filter((l) => l.ownerId === input.requesterId);

    if (leads.length === 0) {
      return left(new Error(`Nenhum lead encontrado para o sourceGroup: ${input.sourceGroup}`));
    }

    const delayMs = input.delayMs ?? 800;

    const result: BatchVerifyEmailsResult = {
      total: leads.length,
      checked: 0,
      valid: 0,
      invalid: 0,
      skipped: 0,
      errors: 0,
    };

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];

      if (!lead.email) {
        result.skipped++;
        input.onProgress?.({
          current: i + 1,
          total: leads.length,
          leadId: lead.id.toString(),
          businessName: lead.businessName,
          valid: null,
        });
        continue;
      }

      try {
        const verificationResult = await this.emailVerifier.verify(lead.email);

        // VO owns the invariant (known status + non-empty reason). A malformed
        // verifier result fails just this lead, not the whole batch.
        const verificationOrError = EmailVerification.create({
          valid: verificationResult.valid,
          status: verificationResult.status,
          reason: verificationResult.reason,
        });
        if (verificationOrError.isLeft()) {
          throw verificationOrError.value;
        }
        const verification = verificationOrError.value;

        await this.leadsRepo.saveEmailVerification(lead.id.toString(), {
          emailVerified: verification.valid,
          emailVerifiedAt: verification.verifiedAt,
          emailVerificationStatus: verification.status,
          emailVerificationReason: verification.reason,
        });

        result.checked++;
        if (verification.valid) result.valid++;
        else result.invalid++;

        input.onProgress?.({
          current: i + 1,
          total: leads.length,
          leadId: lead.id.toString(),
          businessName: lead.businessName,
          valid: verification.valid,
          status: verification.status,
          reason: verification.reason,
        });
      } catch (err) {
        result.errors++;
        input.onProgress?.({
          current: i + 1,
          total: leads.length,
          leadId: lead.id.toString(),
          businessName: lead.businessName,
          valid: null,
          error: err instanceof Error ? err.message : "Erro desconhecido",
        });
      }

      // Rate limit delay between checks (skip after last item)
      if (i < leads.length - 1 && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return right(result);
  }
}
