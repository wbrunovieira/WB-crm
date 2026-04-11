"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import dynamic from "next/dynamic";

const GmailComposeModal = dynamic(() => import("./GmailComposeModal"), {
  ssr: false,
});

interface GmailButtonProps {
  to: string;
  name: string;
  contactId?: string;
  leadId?: string;
  organizationId?: string;
  dealId?: string;
  variant?: "icon" | "badge";
}

export default function GmailButton({
  to,
  name,
  contactId,
  leadId,
  organizationId,
  dealId,
  variant = "badge",
}: GmailButtonProps) {
  const [open, setOpen] = useState(false);

  if (variant === "icon") {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          title={`Enviar e-mail para ${name}`}
          className="inline-flex items-center justify-center rounded-full bg-blue-600 p-1.5 text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Mail className="h-4 w-4" />
        </button>
        {open && (
          <GmailComposeModal
            to={to}
            name={name}
            contactId={contactId}
            leadId={leadId}
            organizationId={organizationId}
            dealId={dealId}
            onClose={() => setOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
      >
        <Mail className="h-4 w-4" />
        Enviar E-mail
      </button>
      {open && (
        <GmailComposeModal
          to={to}
          name={name}
          contactId={contactId}
          leadId={leadId}
          organizationId={organizationId}
          dealId={dealId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
