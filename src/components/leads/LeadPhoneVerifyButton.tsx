"use client";

import { PhoneVerifyButton } from "@/components/shared/verify/PhoneVerifyButton";

interface LeadPhoneVerifyButtonProps {
  leadId: string;
  phone?: string | null;
  phone2?: string | null;
  whatsapp?: string | null;
  /** Dados já existentes do banco */
  existing?: {
    phoneValid?: boolean | null;
    phoneType?: string | null;
    phone2Valid?: boolean | null;
    phone2Type?: string | null;
    whatsappPhoneValid?: boolean | null;
    whatsappPhoneType?: string | null;
  };
}

export function LeadPhoneVerifyButton({ leadId, phone, phone2, whatsapp, existing }: LeadPhoneVerifyButtonProps) {
  return (
    <PhoneVerifyButton
      endpoint={`/phone/verify/lead/${leadId}`}
      phone={phone}
      phone2={phone2}
      whatsapp={whatsapp}
      existing={existing}
    />
  );
}
