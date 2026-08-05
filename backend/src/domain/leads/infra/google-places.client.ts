import { Injectable } from "@nestjs/common";
import { GooglePlacesPort, PlaceResult, SearchPlacesInput, SearchPlacesOutput, PlacesRateLimitError } from "../application/ports/google-places.port";

const PLACES_API_URL = "https://places.googleapis.com/v1/places:searchText";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.location",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.businessStatus",
  "places.types",
  "places.primaryType",
  "places.editorialSummary",
  "places.googleMapsUri",
  "places.regularOpeningHours",
  "nextPageToken",
].join(",");

const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

function extractAddressComponent(
  components: Array<{ longText?: string; shortText?: string; types: string[] }>,
  type: string,
  useShort = false,
): string | undefined {
  const comp = components?.find((c) => c?.types?.includes(type));
  return useShort ? comp?.shortText : comp?.longText;
}

function mapPlace(raw: Record<string, unknown>): PlaceResult {
  const rawComponents = raw.addressComponents;
  const addressComponents: Array<{ longText?: string; shortText?: string; types: string[] }> =
    Array.isArray(rawComponents) ? rawComponents : [];

  const openingHoursRaw = raw.regularOpeningHours as { weekdayDescriptions?: string[] } | undefined;

  return {
    placeId: raw.id as string,
    businessName: (raw.displayName as { text: string })?.text ?? "",
    address: (raw.formattedAddress as string) ?? "",
    city: extractAddressComponent(addressComponents, "locality") ??
      extractAddressComponent(addressComponents, "administrative_area_level_2"),
    state: extractAddressComponent(addressComponents, "administrative_area_level_1"),
    zipCode: extractAddressComponent(addressComponents, "postal_code"),
    country: extractAddressComponent(addressComponents, "country"),
    neighborhood:
      extractAddressComponent(addressComponents, "sublocality_level_1") ??
      extractAddressComponent(addressComponents, "sublocality"),
    phone: raw.nationalPhoneNumber as string | undefined,
    internationalPhone: raw.internationalPhoneNumber as string | undefined,
    website: raw.websiteUri as string | undefined,
    rating: raw.rating as number | undefined,
    userRatingCount: raw.userRatingCount as number | undefined,
    priceLevel:
      raw.priceLevel != null
        ? PRICE_LEVEL_MAP[raw.priceLevel as string] ?? undefined
        : undefined,
    businessStatus: raw.businessStatus as string | undefined,
    types: raw.types as string[] | undefined,
    primaryType: raw.primaryType as string | undefined,
    description: (raw.editorialSummary as { text: string } | undefined)?.text,
    latitude: (raw.location as { latitude: number } | undefined)?.latitude,
    longitude: (raw.location as { longitude: number } | undefined)?.longitude,
    googleMapsUrl: raw.googleMapsUri as string | undefined,
    openingHours: openingHoursRaw?.weekdayDescriptions
      ? JSON.stringify(openingHoursRaw.weekdayDescriptions)
      : undefined,
  };
}

// In-memory cache — avoids re-hitting Google every time a lead page reloads. Small TTL is
// enough (this is a personal CRM, not high-traffic), no infra beyond a plain Map needed.
const PHOTO_CACHE_TTL_MS = 60 * 60 * 1000; // 1h
const photoCache = new Map<string, { buffer: Buffer | null; expiresAt: number }>();

@Injectable()
export class GooglePlacesClient extends GooglePlacesPort {
  async getPhoto(placeId: string): Promise<Buffer | null> {
    const cached = photoCache.get(placeId);
    if (cached && cached.expiresAt > Date.now()) return cached.buffer;

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY não configurada");

    const buffer = await this.fetchPhoto(placeId, apiKey);
    photoCache.set(placeId, { buffer, expiresAt: Date.now() + PHOTO_CACHE_TTL_MS });
    return buffer;
  }

  private async fetchPhoto(placeId: string, apiKey: string): Promise<Buffer | null> {
    const detailsRes = await fetch(`https://places.googleapis.com/v1/places/${placeId}?fields=photos`, {
      headers: { "X-Goog-Api-Key": apiKey },
    });
    if (!detailsRes.ok) return null;

    const details = (await detailsRes.json()) as { photos?: Array<{ name: string }> };
    const photoName = details.photos?.[0]?.name;
    if (!photoName) return null;

    const photoRes = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&key=${apiKey}`,
    );
    if (!photoRes.ok) return null;

    return Buffer.from(await photoRes.arrayBuffer());
  }

  async search(input: SearchPlacesInput): Promise<SearchPlacesOutput> {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY não configurada");

    const body: Record<string, unknown> = {
      textQuery: input.textQuery,
      languageCode: input.languageCode ?? "pt-BR",
    };

    if (input.pageToken) {
      body.pageToken = input.pageToken;
    }

    const response = await fetch(PLACES_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      throw new PlacesRateLimitError(60);
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Google Places API error: ${JSON.stringify(err)}`);
    }

    const data = (await response.json()) as {
      places?: Record<string, unknown>[];
      nextPageToken?: string;
    };

    return {
      places: (data.places ?? []).map(mapPlace),
      nextPageToken: data.nextPageToken,
    };
  }
}
