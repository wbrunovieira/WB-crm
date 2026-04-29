"use client";

import { useEffect } from "react";
import { toast } from "sonner";

interface Props {
  leadId: string;
  message: string;
}

export function LeadWebsiteAlertToast({ leadId, message }: Props) {
  useEffect(() => {
    const id = `website-alert-${leadId}`;
    toast.warning(message, {
      id,
      duration: Infinity,
      closeButton: true,
      action: {
        label: "OK, entendi",
        onClick: () => toast.dismiss(id),
      },
    });
    return () => {
      toast.dismiss(id);
    };
  }, [leadId, message]);

  return null;
}
