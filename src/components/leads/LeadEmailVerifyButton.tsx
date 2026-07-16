"use client";

import { EmailVerifyButton } from "@/components/shared/verify/EmailVerifyButton";

interface LeadEmailVerifyButtonProps {
  email: string;
  leadId: string;
  /** Dados de verificação já existentes (vindos do banco) */
  verified?: {
    at: Date | string;
    status: string;
    reason: string;
    valid: boolean;
  };
}

export function LeadEmailVerifyButton({ email, leadId, verified }: LeadEmailVerifyButtonProps) {
  return <EmailVerifyButton email={email} endpoint={`/email/verify/lead/${leadId}`} verified={verified} />;
}
