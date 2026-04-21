"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { backendFetch } from "@/lib/backend/client";
import { PlacesRateLimitError } from "@/lib/google/places";
export { PlacesRateLimitError };

export interface ExcludeCriteria {
  withoutPhone?: boolean;
  withoutWebsite?: boolean;
  withoutAddress?: boolean;
  withoutCity?: boolean;
  withoutState?: boolean;
  withoutZipCode?: boolean;
  withoutRating?: boolean;
  withoutUserRatings?: boolean;
  withoutDescription?: boolean;
  withoutCoordinates?: boolean;
  withoutPriceLevel?: boolean;
  onlyOperational?: boolean;
}

export interface ImportGoogleLeadsParams {
  country: string;
  city?: string;
  zipCode?: string;
  typeKeyword: string;
  requestedCount: number;
  excludeCriteria?: ExcludeCriteria;
}

function passesExcludeCriteria(place: { phone?: string | null; website?: string | null; address?: string | null; city?: string | null; state?: string | null; zipCode?: string | null; rating?: number | null; userRatingCount?: number | null; description?: string | null; latitude?: number | null; priceLevel?: number | null; businessStatus?: string | null }, criteria?: ExcludeCriteria): boolean {
  if (!criteria) return true;
  if (criteria.withoutPhone && !place.phone) return false;
  if (criteria.withoutWebsite && !place.website) return false;
  if (criteria.withoutAddress && !place.address) return false;
  if (criteria.withoutCity && !place.city) return false;
  if (criteria.withoutState && !place.state) return false;
  if (criteria.withoutZipCode && !place.zipCode) return false;
  if (criteria.withoutRating && !place.rating) return false;
  if (criteria.withoutUserRatings && !place.userRatingCount) return false;
  if (criteria.withoutDescription && !place.description) return false;
  if (criteria.withoutCoordinates && !place.latitude) return false;
  if (criteria.withoutPriceLevel && place.priceLevel == null) return false;
  if (criteria.onlyOperational && place.businessStatus !== "OPERATIONAL") return false;
  return true;
}

export interface ImportGoogleLeadsResult {
  success: boolean;
  imported: number;
  skipped: number;
  status: "complete" | "exhausted" | "rate_limited";
  retryAfterSeconds?: number;
  error?: string;
}

function buildSearchQuery(params: ImportGoogleLeadsParams): string {
  const parts = [params.typeKeyword];
  if (params.city) parts.push(`em ${params.city}`);
  if (params.zipCode) parts.push(params.zipCode);
  if (params.country) parts.push(params.country === "BR" ? "Brazil" : params.country);
  return parts.join(", ");
}

export async function importGoogleLeads(
  params: ImportGoogleLeadsParams
): Promise<ImportGoogleLeadsResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, imported: 0, skipped: 0, status: "complete", error: "Não autorizado" };
  }

  const ownerId = session.user.id;
  const searchQuery = buildSearchQuery(params);

  const searchProfile = await backendFetch<{ id: string; fetchedPlaceIds: string }>("/leads/google-places-searches/find-or-create", {
    method: "POST",
    body: JSON.stringify({
      ownerId,
      country: params.country,
      city: params.city,
      zipCode: params.zipCode,
      typeKeyword: params.typeKeyword,
      searchQuery,
    }),
  });

  let fetchedPlaceIds: string[] = [];
  try {
    const parsed: unknown = JSON.parse(searchProfile.fetchedPlaceIds || "[]");
    fetchedPlaceIds = Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    fetchedPlaceIds = [];
  }
  let imported = 0;
  let skipped = 0;
  let pageToken: string | undefined;
  let newlySeenIds: string[] = [];

  try {
    while (imported < params.requestedCount) {
      const result = await backendFetch<{ places: Array<{ placeId: string; businessName: string; address: string; city?: string; state?: string; zipCode?: string; country?: string; neighborhood?: string; phone?: string; internationalPhone?: string; website?: string; rating?: number; userRatingCount?: number; priceLevel?: number; businessStatus?: string; types?: string[]; primaryType?: string; description?: string; latitude?: number; longitude?: number; googleMapsUrl?: string; openingHours?: string }>; nextPageToken?: string }>("/leads/google-places/search", {
        method: "POST",
        body: JSON.stringify({ textQuery: searchQuery, pageToken }),
      }).catch((err: unknown) => {
        if (err instanceof Error && (err as Error & { status?: number }).status === 429) {
          const body = (err as Error & { body?: { retryAfterSeconds?: number } }).body;
          throw new PlacesRateLimitError(body?.retryAfterSeconds ?? 60);
        }
        throw err;
      });

      if (result.places.length === 0) {
        await updateProfile(searchProfile.id, fetchedPlaceIds, newlySeenIds, imported);
        return { success: true, imported, skipped, status: "exhausted" };
      }

      for (const place of result.places) {
        if (!place.placeId) { skipped++; continue; }

        if (fetchedPlaceIds.includes(place.placeId)) {
          skipped++;
          continue;
        }

        newlySeenIds.push(place.placeId);
        fetchedPlaceIds.push(place.placeId);

        if (!passesExcludeCriteria(place, params.excludeCriteria)) {
          skipped++;
          continue;
        }

        const { exists } = await backendFetch<{ exists: boolean }>(`/leads/check-google-id?googleId=${encodeURIComponent(place.placeId)}`);

        if (exists) {
          skipped++;
          continue;
        }

        await backendFetch("/leads", {
          method: "POST",
          body: JSON.stringify({
            googleId: place.placeId,
            businessName: place.businessName,
            address: place.address,
            city: place.city,
            state: place.state,
            zipCode: place.zipCode,
            country: place.country,
            vicinity: place.neighborhood ?? null,
            phone: place.phone,
            whatsapp: place.internationalPhone ?? null,
            website: place.website,
            rating: place.rating,
            userRatingsTotal: place.userRatingCount,
            priceLevel: place.priceLevel,
            businessStatus: place.businessStatus,
            types: place.types ? JSON.stringify(place.types) : null,
            categories: place.primaryType ?? null,
            description: place.description,
            latitude: place.latitude,
            longitude: place.longitude,
            googleMapsUrl: place.googleMapsUrl,
            openingHours: place.openingHours ?? null,
            source: "google_places",
            searchTerm: searchQuery,
            isProspect: true,
            ownerId,
            googlePlacesSearchId: searchProfile.id,
          }),
        });

        imported++;

        if (imported >= params.requestedCount) break;
      }

      if (imported >= params.requestedCount) break;

      if (!result.nextPageToken) {
        await updateProfile(searchProfile.id, fetchedPlaceIds, newlySeenIds, imported);
        return { success: true, imported, skipped, status: "exhausted" };
      }

      pageToken = result.nextPageToken;

      await new Promise((r) => setTimeout(r, 2000));
    }

    await updateProfile(searchProfile.id, fetchedPlaceIds, newlySeenIds, imported);
    revalidatePath("/leads");
    revalidatePath("/leads/prospects");
    return { success: true, imported, skipped, status: "complete" };
  } catch (err) {
    await updateProfile(searchProfile.id, fetchedPlaceIds, newlySeenIds, imported).catch(() => {});

    if (err instanceof PlacesRateLimitError) {
      return {
        success: false,
        imported,
        skipped,
        status: "rate_limited",
        retryAfterSeconds: err.retryAfterSeconds,
      };
    }

    return {
      success: false,
      imported,
      skipped,
      status: "complete",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function updateProfile(
  id: string,
  allFetchedIds: string[],
  newlySeenIds: string[],
  imported: number,
) {
  await backendFetch(`/leads/google-places-searches/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      fetchedPlaceIds: JSON.stringify(allFetchedIds),
      newlySeenCount: newlySeenIds.length,
      importedCount: imported,
    }),
  });
}
