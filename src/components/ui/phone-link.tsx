"use client";

import { Phone } from "lucide-react";

interface PhoneLinkProps {
  phone?: string | null;
  showIcon?: boolean;
  className?: string;
}

function toTelHref(phone: string): string {
  // Remove tudo exceto dígitos e o + inicial
  const digitsOnly = phone.replace(/[^\d+]/g, "");
  // Se já começa com +, usa direto; senão adiciona tel: sem modificar
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
      className={`inline-flex items-center gap-1.5 ${className}`}
    >
      {showIcon && <Phone className="h-3.5 w-3.5 flex-shrink-0" />}
      {phone}
    </a>
  );
}
