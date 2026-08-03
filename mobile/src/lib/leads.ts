import { apiFetch } from "./api";
import type { Place } from "./places";

/** Field-capture origin tag; groups all door-to-door leads together in the CRM. */
const SOURCE_GROUP = "porta-a-porta";

export interface CreatedLead {
  id: string;
  businessName?: string;
}

/** Builds the `POST /leads` body from a Google place (mirrors the web import mapping). */
export function placeToLeadBody(place: Place, searchTerm: string) {
  return {
    googleId: place.placeId,
    businessName: place.businessName,
    address: place.address,
    city: place.city,
    state: place.state,
    zipCode: place.zipCode,
    country: place.country,
    vicinity: place.neighborhood,
    phone: place.internationalPhone ?? place.phone,
    // whatsapp is left unset on purpose: Google's number is often a landline, and a
    // non-mobile in `whatsapp` would break WhatsApp flows. Confirm/set it in the CRM.
    website: place.website,
    rating: place.rating,
    userRatingsTotal: place.userRatingCount,
    priceLevel: place.priceLevel,
    businessStatus: place.businessStatus,
    types: place.types ? JSON.stringify(place.types) : undefined,
    categories: place.primaryType,
    description: place.description,
    latitude: place.latitude,
    longitude: place.longitude,
    googleMapsUrl: place.googleMapsUrl,
    openingHours: place.openingHours,
    source: "google_places",
    searchTerm,
    isProspect: false, // shows up directly in the main /leads list
    sourceGroup: SOURCE_GROUP,
  };
}

/** Creates a lead. Returns the created lead (with its id). */
export function createLead(body: ReturnType<typeof placeToLeadBody>): Promise<CreatedLead> {
  return apiFetch<CreatedLead>("/leads", { method: "POST", body });
}

/** Logs the door-to-door visit as a completed `physical_visit` activity on the lead. */
export function createVisitActivity(leadId: string, businessName: string, notes?: string): Promise<{ id: string }> {
  return apiFetch<{ id: string }>("/activities", {
    method: "POST",
    body: {
      type: "physical_visit",
      subject: `Visita porta a porta — ${businessName}`,
      leadId,
      description: notes?.trim() || undefined,
      completed: true,
      completedAt: new Date().toISOString(),
    },
  });
}
