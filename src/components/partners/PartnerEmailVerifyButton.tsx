"use client";

import { EmailVerifyButton } from "@/components/shared/verify/EmailVerifyButton";

interface PartnerEmailVerifyButtonProps {
  email: string;
  partnerId: string;
  verified?: {
    at?: Date | string | null;
    status?: string | null;
    reason?: string | null;
    valid?: boolean | null;
  };
}

export function PartnerEmailVerifyButton({ email, partnerId, verified }: PartnerEmailVerifyButtonProps) {
  // Partner email verification is served under the /phone route (…/email).
  return <EmailVerifyButton email={email} endpoint={`/phone/verify/partner/${partnerId}/email`} verified={verified} />;
}
