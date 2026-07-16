"use client";

import { EmailVerifyButton } from "@/components/shared/verify/EmailVerifyButton";

interface LeadContactEmailVerifyButtonProps {
  email: string;
  leadContactId: string;
  verified?: {
    at: Date | string;
    status: string;
    reason: string;
    valid: boolean;
  };
}

export function LeadContactEmailVerifyButton({ email, leadContactId, verified }: LeadContactEmailVerifyButtonProps) {
  return <EmailVerifyButton email={email} endpoint={`/email/verify/lead-contact/${leadContactId}`} verified={verified} />;
}
