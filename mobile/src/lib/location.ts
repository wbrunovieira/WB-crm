import * as Location from "expo-location";

export class LocationPermissionError extends Error {
  constructor() {
    super("location-permission-denied");
    this.name = "LocationPermissionError";
  }
}

/** Requests permission, gets the position and reverse-geocodes it on-device (free, no key). */
async function currentPlace(): Promise<{ place: Location.LocationGeocodedAddress | undefined; latitude: number; longitude: number }> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") throw new LocationPermissionError();

  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const { latitude, longitude } = pos.coords;
  const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
  return { place, latitude, longitude };
}

export interface NearbyContext {
  /** Human-readable area, e.g. "Alto, Teresópolis, RJ". */
  label: string;
  /** Same area, used to bias the text query ("<termo> em <label>"). */
  queryArea: string;
  // Raw coords — currently unused (the search biases via reverse-geocoded text, since the
  // backend has no locationBias param yet). Reserved for a precise GPS-radius search later.
  latitude: number;
  longitude: number;
}

/** Neighborhood + city of the current location, to bias the Google search to "near me". */
export async function getNearbyContext(): Promise<NearbyContext> {
  const { place, latitude, longitude } = await currentPlace();
  // Don't fall back to `subregion` for the neighborhood — it's usually the same as the city
  // in small towns, which would duplicate the value across both fields.
  const neighborhood = place?.district ?? undefined;
  const city = place?.city ?? place?.subregion ?? undefined;
  const uf = place?.region ?? undefined;

  const parts = [neighborhood, city, uf].filter((p): p is string => Boolean(p));
  return { label: parts.join(", ") || "sua localização", queryArea: parts.join(", "), latitude, longitude };
}

export interface AddressFields {
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude: number;
  longitude: number;
}

/** Structured address of the current location, to pre-fill the manual lead form (all editable). */
export async function getCurrentAddress(): Promise<AddressFields> {
  const { place, latitude, longitude } = await currentPlace();
  const street = [place?.street, place?.streetNumber].filter(Boolean).join(", ");
  return {
    address: street || place?.name || "",
    neighborhood: place?.district ?? "", // not `subregion` — that would duplicate the city
    city: place?.city ?? place?.subregion ?? "",
    state: place?.region ?? "",
    zipCode: place?.postalCode ?? "",
    country: place?.country ?? "",
    latitude,
    longitude,
  };
}
