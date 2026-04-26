"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import WhatsAppMessageLog, { WhatsAppMediaMessage } from "./WhatsAppMessageLog";

interface Props {
  activityId: string;
  description: string;
  previewCount?: number;
}

/**
 * Wrapper around WhatsAppMessageLog that auto-fetches media messages
 * (audio, video, images, documents) for the given activity.
 */
export default function WhatsAppActivityLog({ activityId, description, previewCount = 3 }: Props) {
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken ?? "";
  const [mediaMessages, setMediaMessages] = useState<WhatsAppMediaMessage[]>([]);

  useEffect(() => {
    if (!token || !activityId) return;

    apiFetch<WhatsAppMediaMessage[]>(`/whatsapp/messages/${activityId}`, token)
      .then(setMediaMessages)
      .catch(() => {/* non-fatal */});
  }, [activityId, token]);

  return (
    <WhatsAppMessageLog
      description={description}
      mediaMessages={mediaMessages}
      previewCount={previewCount}
    />
  );
}
