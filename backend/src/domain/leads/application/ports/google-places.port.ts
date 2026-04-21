export interface PlaceResult {
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

export interface SearchPlacesInput {
  textQuery: string;
  pageToken?: string;
  languageCode?: string;
}

export interface SearchPlacesOutput {
  places: PlaceResult[];
  nextPageToken?: string;
}

export class PlacesRateLimitError extends Error {
  retryAfterSeconds: number;
  constructor(retryAfterSeconds = 60) {
    super("Google Places API rate limit exceeded");
    this.name = "PlacesRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export abstract class GooglePlacesPort {
  abstract search(input: SearchPlacesInput): Promise<SearchPlacesOutput>;
}
