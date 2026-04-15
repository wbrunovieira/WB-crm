"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { searchPlaces, PlacesRateLimitError } from "@/lib/google/places";

export interface ImportGoogleLeadsParams {
  country: string;
  city?: string;
  zipCode?: string;
  typeKeyword: string;
  requestedCount: number;
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

  // Carrega perfil existente ou cria novo
  const profileWhere = {
    ownerId,
    country: params.country,
    city: params.city ?? null,
    zipCode: params.zipCode ?? null,
    typeKeyword: params.typeKeyword,
  };

  let searchProfile = await prisma.googlePlacesSearch.findFirst({
    where: profileWhere,
  });

  if (!searchProfile) {
    searchProfile = await prisma.googlePlacesSearch.create({
      data: {
        ownerId,
        country: params.country,
        city: params.city,
        zipCode: params.zipCode,
        typeKeyword: params.typeKeyword,
        searchQuery,
        fetchedPlaceIds: "[]",
      },
    });
  }

  let fetchedPlaceIds: string[] = JSON.parse(searchProfile.fetchedPlaceIds || "[]");
  let imported = 0;
  let skipped = 0;
  let pageToken: string | undefined;
  let newlySeenIds: string[] = [];

  try {
    while (imported < params.requestedCount) {
      const result = await searchPlaces({
        textQuery: searchQuery,
        pageToken,
      });

      if (result.places.length === 0) {
        await updateProfile(searchProfile.id, fetchedPlaceIds, newlySeenIds, imported, skipped);
        return { success: true, imported, skipped, status: "exhausted" };
      }

      for (const place of result.places) {
        // 1. Já vimos este place nesta busca?
        if (fetchedPlaceIds.includes(place.placeId)) {
          skipped++;
          continue;
        }

        // Marca como visto (independente de importar ou não)
        newlySeenIds.push(place.placeId);
        fetchedPlaceIds.push(place.placeId);

        // 2. Já existe Lead com este googleId (busca global, sem filtro de owner)?
        const existing = await prisma.lead.findFirst({
          where: { googleId: place.placeId },
          select: { id: true },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // 3. Cria o Lead
        await prisma.lead.create({
          data: {
            googleId: place.placeId,
            businessName: place.businessName,
            address: place.address,
            city: place.city,
            state: place.state,
            zipCode: place.zipCode,
            country: place.country,
            phone: place.phone,
            website: place.website,
            rating: place.rating,
            userRatingsTotal: place.userRatingCount,
            priceLevel: place.priceLevel,
            businessStatus: place.businessStatus,
            types: place.types ? JSON.stringify(place.types) : null,
            description: place.description,
            latitude: place.latitude,
            longitude: place.longitude,
            googleMapsUrl: place.googleMapsUrl,
            source: "google_places",
            searchTerm: searchQuery,
            ownerId,
            googlePlacesSearchId: searchProfile.id,
          },
        });

        imported++;

        if (imported >= params.requestedCount) break;
      }

      if (imported >= params.requestedCount) break;

      if (!result.nextPageToken) {
        await updateProfile(searchProfile.id, fetchedPlaceIds, newlySeenIds, imported, skipped);
        return { success: true, imported, skipped, status: "exhausted" };
      }

      pageToken = result.nextPageToken;

      // Google exige ~2s antes de usar o next_page_token
      await new Promise((r) => setTimeout(r, 2000));
    }

    await updateProfile(searchProfile.id, fetchedPlaceIds, newlySeenIds, imported, skipped);
    revalidatePath("/leads");
    return { success: true, imported, skipped, status: "complete" };
  } catch (err) {
    // Salva progresso mesmo em caso de erro
    await updateProfile(searchProfile.id, fetchedPlaceIds, newlySeenIds, imported, skipped).catch(() => {});

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
  _skipped: number
) {
  const current = await prisma.googlePlacesSearch.findUnique({
    where: { id },
    select: { totalFetched: true, totalImported: true },
  });

  await prisma.googlePlacesSearch.update({
    where: { id },
    data: {
      fetchedPlaceIds: JSON.stringify(allFetchedIds),
      totalFetched: (current?.totalFetched ?? 0) + newlySeenIds.length,
      totalImported: (current?.totalImported ?? 0) + imported,
      lastFetchedAt: new Date(),
      status: "active",
    },
  });
}
