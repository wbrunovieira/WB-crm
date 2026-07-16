"use client";

import { PhoneVerifyButton } from "@/components/shared/verify/PhoneVerifyButton";

interface PartnerPhoneVerifyButtonProps {
  partnerId: string;
  phone?: string | null;
  whatsapp?: string | null;
  existing?: {
    phoneValid?: boolean | null;
    phoneType?: string | null;
    whatsappPhoneValid?: boolean | null;
    whatsappPhoneType?: string | null;
  };
}

export function PartnerPhoneVerifyButton({ partnerId, phone, whatsapp, existing }: PartnerPhoneVerifyButtonProps) {
  return <PhoneVerifyButton endpoint={`/phone/verify/partner/${partnerId}`} phone={phone} whatsapp={whatsapp} existing={existing} />;
}
