import { apiFetch } from "./api";

/** A Google Business Profile result, as returned by the CRM's Places proxy. */
export interface Place {
  placeId: string;
  businessName: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  neighborhood?: string;
  phone?: string;
  internationalPhone?: string;
  website?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: number;
  businessStatus?: string;
  types?: string[];
  primaryType?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
  openingHours?: string;
}

export interface PlacesSearchResult {
  places: Place[];
  nextPageToken?: string;
}

/** Search Google Business Profile via the CRM (`POST /leads/google-places/search`). */
export function searchPlaces(textQuery: string, pageToken?: string): Promise<PlacesSearchResult> {
  return apiFetch<PlacesSearchResult>("/leads/google-places/search", {
    method: "POST",
    body: { textQuery, pageToken, languageCode: "pt-BR" },
  });
}

/** Whether a place is already a lead (`Lead.googleId` is unique) — avoids duplicates. */
export function checkGoogleId(googleId: string): Promise<{ exists: boolean }> {
  return apiFetch<{ exists: boolean }>(`/leads/check-google-id?googleId=${encodeURIComponent(googleId)}`);
}
