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

/** The two shapes accepted by `POST /leads`: from a Google place or from the manual form. */
export type LeadBody = ReturnType<typeof placeToLeadBody> | ReturnType<typeof manualLeadBody>;

/** Creates a lead (accepts either the Google-place body or the manual body). */
export function createLead(body: LeadBody): Promise<CreatedLead> {
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

/** Fields captured in the manual / GPS lead form. */
export interface ManualLeadFields {
  businessName: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  website?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}

/** Builds the `POST /leads` body from a manually-entered (or GPS-filled) form. */
export function manualLeadBody(f: ManualLeadFields) {
  const clean = (s?: string) => (s && s.trim() ? s.trim() : undefined);
  return {
    businessName: f.businessName.trim(),
    address: clean(f.address),
    vicinity: clean(f.neighborhood),
    city: clean(f.city),
    state: clean(f.state),
    zipCode: clean(f.zipCode),
    country: clean(f.country),
    phone: clean(f.phone),
    website: clean(f.website),
    description: clean(f.description),
    latitude: f.latitude,
    longitude: f.longitude,
    source: "door_to_door",
    isProspect: false,
    sourceGroup: SOURCE_GROUP,
  };
}

/**
 * Creates the lead and logs the visit. The visit activity is NON-FATAL: if it fails, the
 * lead still exists and we report the partial outcome (visitLogged=false) instead of failing
 * the whole operation. `body.businessName` is used for the activity subject.
 */
export async function createLeadWithVisit(
  body: LeadBody,
  notes?: string,
): Promise<{ lead: CreatedLead; visitLogged: boolean }> {
  const lead = await createLead(body);
  let visitLogged = true;
  try {
    await createVisitActivity(lead.id, body.businessName, notes);
  } catch {
    visitLogged = false;
  }
  return { lead, visitLogged };
}
