"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { LeadGooglePlacesLinkModal } from "./LeadGooglePlacesLinkModal";

interface LeadSnapshot {
  id: string;
  businessName: string;
  registeredName?: string | null;
  city?: string | null;
  address?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  phone?: string | null;
  website?: string | null;
  rating?: number | null;
  userRatingsTotal?: number | null;
  priceLevel?: number | null;
  businessStatus?: string | null;
  categories?: string | null;
  types?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  googleId?: string | null;
  description?: string | null;
  openingHours?: string | null;
}

interface Props {
  lead: LeadSnapshot;
}

export function LeadGooglePlacesLinkButton({ lead }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleDone() {
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700 hover:bg-purple-200 transition-colors"
      >
        <MapPin className="h-3.5 w-3.5" />
        {lead.googleId ? "Atualizar Google Places" : "Vincular Google Places"}
      </button>

      {open && (
        <LeadGooglePlacesLinkModal
          lead={lead}
          onDone={handleDone}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}
