"use client";

import { EmailVerifyButton } from "@/components/shared/verify/EmailVerifyButton";

interface ContactEmailVerifyButtonProps {
  email: string;
  contactId: string;
  verified?: {
    at?: Date | string | null;
    status?: string | null;
    reason?: string | null;
    valid?: boolean | null;
  };
}

export function ContactEmailVerifyButton({ email, contactId, verified }: ContactEmailVerifyButtonProps) {
  // Contact email verification is served under the /phone route (…/email).
  return <EmailVerifyButton email={email} endpoint={`/phone/verify/contact/${contactId}/email`} verified={verified} />;
}
