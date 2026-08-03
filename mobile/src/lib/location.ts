import * as Location from "expo-location";

export class LocationPermissionError extends Error {
  constructor() {
    super("location-permission-denied");
    this.name = "LocationPermissionError";
  }
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

/**
 * Asks for foreground location, gets the current position and reverse-geocodes it
 * **on-device** (Apple/Google OS geocoder — free, no API key). Returns the neighborhood +
 * city so the search can be biased to "near me". Throws LocationPermissionError if denied.
 */
export async function getNearbyContext(): Promise<NearbyContext> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") throw new LocationPermissionError();

  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const { latitude, longitude } = pos.coords;

  const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
  const neighborhood = place?.district ?? place?.subregion ?? undefined;
  const city = place?.city ?? place?.subregion ?? undefined;
  const uf = place?.region ?? undefined;

  const parts = [neighborhood, city, uf].filter((p): p is string => Boolean(p));
  const label = parts.join(", ") || "sua localização";

  return { label, queryArea: parts.join(", "), latitude, longitude };
}
