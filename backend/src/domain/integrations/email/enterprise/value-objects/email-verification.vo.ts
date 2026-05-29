import { Either, left, right } from "@/core/either";

export type EmailVerificationStatus = "valid" | "invalid" | "risky" | "unknown";

const KNOWN_STATUSES: readonly EmailVerificationStatus[] = ["valid", "invalid", "risky", "unknown"];

const DEFAULT_REASON: Record<EmailVerificationStatus, string> = {
  valid: "Email válido (valid)",
  invalid: "Email inválido (invalid)",
  risky: "Email arriscado (risky)",
  unknown: "Status desconhecido (unknown)",
};

export class InvalidEmailVerificationError extends Error {
  name = "InvalidEmailVerificationError";
}

export interface EmailVerificationInput {
  valid: boolean;
  status: EmailVerificationStatus;
  reason: string;
}

/**
 * Value Object — the outcome of verifying a contact's email address.
 *
 * Encapsulates the invariant that `status` is one of the known values and that
 * a non-empty `reason` is always present (falling back to a status-derived
 * message). `valid` is intentionally NOT coupled to `status`: a "risky" or
 * "unknown" email may legitimately be treated as valid or not by the verifier.
 *
 * Use cases must build this VO instead of validating the raw verifier output
 * inline.
 */
export class EmailVerification {
  private constructor(
    public readonly valid: boolean,
    public readonly status: EmailVerificationStatus,
    public readonly reason: string,
    public readonly verifiedAt: Date,
  ) {}

  static create(
    input: EmailVerificationInput,
    verifiedAt?: Date,
  ): Either<InvalidEmailVerificationError, EmailVerification> {
    if (!KNOWN_STATUSES.includes(input.status)) {
      return left(new InvalidEmailVerificationError(`status inválido: ${String(input.status)}`));
    }

    const trimmed = (input.reason ?? "").trim();
    const reason = trimmed.length > 0 ? trimmed : DEFAULT_REASON[input.status];

    return right(new EmailVerification(input.valid, input.status, reason, verifiedAt ?? new Date()));
  }
}
