import type { Place } from "./places";

/**
 * Tiny module store to hand the tapped place (and the search term that found it) from the
 * search screen to the confirm screen. Simpler than serializing a large object through
 * router params; the confirm screen reads it once on mount.
 */
let selected: { place: Place; searchTerm: string } | null = null;

export function setSelectedPlace(place: Place, searchTerm: string): void {
  selected = { place, searchTerm };
}

export function getSelectedPlace(): { place: Place; searchTerm: string } | null {
  return selected;
}

export function clearSelectedPlace(): void {
  selected = null;
}
