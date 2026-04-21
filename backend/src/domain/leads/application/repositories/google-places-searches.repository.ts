export interface GooglePlacesSearchRecord {
  id: string;
  ownerId: string;
  country: string;
  city: string | null;
  zipCode: string | null;
  typeKeyword: string;
  searchQuery: string;
  fetchedPlaceIds: string;
  totalFetched: number;
  totalImported: number;
  lastFetchedAt: Date | null;
  status: string;
}

export abstract class GooglePlacesSearchesRepository {
  abstract findFirst(where: { ownerId: string; country: string; city?: string | null; zipCode?: string | null; typeKeyword: string }): Promise<GooglePlacesSearchRecord | null>;
  abstract create(data: { ownerId: string; country: string; city?: string; zipCode?: string; typeKeyword: string; searchQuery: string }): Promise<GooglePlacesSearchRecord>;
  abstract update(id: string, data: { fetchedPlaceIds: string; totalFetched: number; totalImported: number }): Promise<void>;
  abstract findLeadByGoogleId(googleId: string): Promise<{ id: string } | null>;
}
