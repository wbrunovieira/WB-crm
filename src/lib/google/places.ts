const PLACES_API_URL = "https://places.googleapis.com/v1/places:searchText";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.location",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.businessStatus",
  "places.types",
  "places.primaryType",
  "places.editorialSummary",
  "places.googleMapsUri",
  "nextPageToken",
].join(",");

const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

export class PlacesRateLimitError extends Error {
  retryAfterSeconds: number;
  constructor(retryAfterSeconds = 60) {
    super("Google Places API rate limit exceeded");
    this.name = "PlacesRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface PlaceResult {
  placeId: string;
  businessName: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  website?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: number;
  businessStatus?: string;
  types?: string[];
  description?: string;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
}

export interface SearchPlacesResult {
  places: PlaceResult[];
  nextPageToken?: string;
}

export interface SearchPlacesParams {
  textQuery: string;
  pageToken?: string;
  languageCode?: string;
}

function extractAddressComponent(
  components: Array<{ longText?: string; shortText?: string; types: string[] }>,
  type: string,
  useShort = false
): string | undefined {
  const comp = components?.find((c) => c.types.includes(type));
  return useShort ? comp?.shortText : comp?.longText;
}

function mapPlace(raw: Record<string, unknown>): PlaceResult {
  const addressComponents = (raw.addressComponents as Array<{
    longText?: string;
    shortText?: string;
    types: string[];
  }>) ?? [];

  return {
    placeId: raw.id as string,
    businessName: (raw.displayName as { text: string })?.text ?? "",
    address: (raw.formattedAddress as string) ?? "",
    city: extractAddressComponent(addressComponents, "locality"),
    state: extractAddressComponent(addressComponents, "administrative_area_level_1"),
    zipCode: extractAddressComponent(addressComponents, "postal_code"),
    country: extractAddressComponent(addressComponents, "country"),
    phone: raw.nationalPhoneNumber as string | undefined,
    website: raw.websiteUri as string | undefined,
    rating: raw.rating as number | undefined,
    userRatingCount: raw.userRatingCount as number | undefined,
    priceLevel:
      raw.priceLevel != null
        ? PRICE_LEVEL_MAP[raw.priceLevel as string] ?? undefined
        : undefined,
    businessStatus: raw.businessStatus as string | undefined,
    types: raw.types as string[] | undefined,
    description: (raw.editorialSummary as { text: string } | undefined)?.text,
    latitude: (raw.location as { latitude: number } | undefined)?.latitude,
    longitude: (raw.location as { longitude: number } | undefined)?.longitude,
    googleMapsUrl: raw.googleMapsUri as string | undefined,
  };
}

export async function searchPlaces(params: SearchPlacesParams): Promise<SearchPlacesResult> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY não configurada");

  const body: Record<string, unknown> = {
    textQuery: params.textQuery,
    languageCode: params.languageCode ?? "pt-BR",
  };

  if (params.pageToken) {
    body.pageToken = params.pageToken;
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
