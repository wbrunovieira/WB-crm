"use client";

import { PhoneVerifyButton } from "@/components/shared/verify/PhoneVerifyButton";

interface ContactPhoneVerifyButtonProps {
  contactId: string;
  phone?: string | null;
  whatsapp?: string | null;
  existing?: {
    phoneValid?: boolean | null;
    phoneType?: string | null;
    whatsappPhoneValid?: boolean | null;
    whatsappPhoneType?: string | null;
  };
}

export function ContactPhoneVerifyButton({ contactId, phone, whatsapp, existing }: ContactPhoneVerifyButtonProps) {
  return <PhoneVerifyButton endpoint={`/phone/verify/contact/${contactId}`} phone={phone} whatsapp={whatsapp} existing={existing} />;
}
