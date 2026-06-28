export interface BookingTypeRecord {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  durationMinutes: number;
  bufferMinutes: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  timeZone: string;
  weeklyHours: { weekday: number; start: string; end: string }[]; // já parseado
  presentialCities: { city: string; state?: string }[];           // já parseado
  active: boolean;
}

export abstract class BookingTypesRepository {
  abstract findById(id: string): Promise<BookingTypeRecord | null>;
}
