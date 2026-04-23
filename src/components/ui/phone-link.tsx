"use client";

import { Phone } from "lucide-react";

interface PhoneLinkProps {
  phone?: string | null;
  showIcon?: boolean;
  className?: string;
}

function toTelHref(phone: string): string {
  const digitsOnly = phone.replace(/[^\d+]/g, "");
  return `tel:${digitsOnly}`;
}

export function PhoneLink({
  phone,
  showIcon = true,
  className = "text-gray-600 hover:text-primary",
}: PhoneLinkProps) {
  if (!phone) return null;

  return (
    <a
      href={toTelHref(phone)}
      title={`Ligar para ${phone}`}
      data-phone-link
      className={`group inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 -mx-1.5 transition-all duration-150 hover:bg-primary/8 ${className}`}
    >
      {showIcon && (
        <Phone className="h-3.5 w-3.5 flex-shrink-0 transition-transform duration-150 group-hover:scale-110" />
      )}
      <span className="transition-all duration-150 group-hover:tracking-wide">
        {phone}
      </span>
    </a>
  );
}
