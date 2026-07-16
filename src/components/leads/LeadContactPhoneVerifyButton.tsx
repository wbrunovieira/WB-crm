"use client";

import { PhoneVerifyButton } from "@/components/shared/verify/PhoneVerifyButton";

interface LeadContactPhoneVerifyButtonProps {
  leadContactId: string;
  phone?: string | null;
  /** Dados já existentes do banco */
  existing?: {
    phoneValid?: boolean | null;
    phoneType?: string | null;
  };
}

export function LeadContactPhoneVerifyButton({ leadContactId, phone, existing }: LeadContactPhoneVerifyButtonProps) {
  return <PhoneVerifyButton endpoint={`/phone/verify/lead-contact/${leadContactId}`} phone={phone} existing={existing} />;
}
