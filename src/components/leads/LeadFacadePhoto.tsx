"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { BACKEND_URL } from "@/lib/api-client";
import type { Activity } from "@/types/activity";

interface Props {
  leadId: string;
  hasGoogleId: boolean;
  activities: Activity[];
}

/**
 * Storefront photo captured in the field (mobile app "foto da fachada"), falling back to the
 * lead's Google Business Profile photo when there's no facade photo but the lead has a
 * `googleId`. Both endpoints stream via SseJwtAuthGuard (?token= — <img> can't send headers).
 */
export function LeadFacadePhoto({ leadId, hasGoogleId, activities }: Props) {
  const { data: session } = useSession();
  const [googleFailed, setGoogleFailed] = useState(false);
  const token = session?.user?.accessToken;
  if (!token) return null;

  const withPhoto = activities
    .filter((a) => a.type === "physical_visit" && a.photoKey)
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0];

  if (withPhoto) {
    return (
      <img
        src={`${BACKEND_URL}/activities/${withPhoto.id}/photo?token=${encodeURIComponent(token)}`}
        alt="Foto da fachada"
        className="h-20 w-20 shrink-0 rounded-xl object-cover border border-purple-900/30"
      />
    );
  }

  if (hasGoogleId && !googleFailed) {
    return (
      <img
        src={`${BACKEND_URL}/leads/${leadId}/google-photo?token=${encodeURIComponent(token)}`}
        alt="Foto do Google Meu Negócio"
        className="h-20 w-20 shrink-0 rounded-xl object-cover border border-purple-900/30"
        onError={() => setGoogleFailed(true)}
      />
    );
  }

  return null;
}
