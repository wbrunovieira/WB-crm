export interface EmailVerificationResult {
  valid: boolean;
  status: "valid" | "invalid" | "risky" | "unknown";
  reason: string;
}

export abstract class EmailVerifierPort {
  abstract verify(email: string): Promise<EmailVerificationResult>;
}
