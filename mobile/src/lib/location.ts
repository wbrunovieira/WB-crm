import { Platform } from "react-native";
import * as Location from "expo-location";

export class LocationPermissionError extends Error {
  constructor() {
    super("location-permission-denied");
    this.name = "LocationPermissionError";
  }
}

export class GeocodeNotFoundError extends Error {
  constructor() {
    super("geocode-not-found");
    this.name = "GeocodeNotFoundError";
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

/** Forward-geocodes a TYPED address into coordinates — on-device (Apple's geocoder on iOS,
 *  free, no key), unlike `getCurrentAddress` this never touches the device's GPS sensor. For
 *  leads captured away from the actual location (filling in a card scanned elsewhere, or typing
 *  a manual entry back at the car/home) — an alternative to "Usar minha localização", not a
 *  replacement: optional, only makes sense once an address has been typed. */
export async function geocodeAddress(fields: {
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}): Promise<{ latitude: number; longitude: number }> {
  // Android requires location permission before geocoding; iOS's CLGeocoder doesn't. This app
  // is iOS-only (see mobile/CLAUDE.md), so skip the check entirely rather than hard-blocking the
  // one feature meant as an ALTERNATIVE to GPS for a rep who denied location permission on
  // purpose (e.g. doesn't want the app tracking their live position, but is fine typing an
  // address) — gated behind Platform.OS in case Android is ever added.
  if (Platform.OS === "android") {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") throw new LocationPermissionError();
  }

  const query = [fields.address, fields.neighborhood, fields.city, fields.state, fields.zipCode, fields.country]
    .filter((p): p is string => Boolean(p && p.trim()))
    .join(", ");
  if (!query) throw new GeocodeNotFoundError();

  const results = await Location.geocodeAsync(query);
  if (!results.length) throw new GeocodeNotFoundError();
  const { latitude, longitude } = results[0];
  return { latitude, longitude };
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
