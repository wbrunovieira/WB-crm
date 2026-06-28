import { BookingTypeRecord } from "./booking-types.repository";

export interface CreateBookingTypeData {
  ownerId: string;
  name: string;
  slug: string;
  durationMinutes: number;
  bufferMinutes: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  timeZone: string;
  weeklyHours: { weekday: number; start: string; end: string }[];
  presentialCities: { city: string; state?: string }[];
  active: boolean;
}

export interface UpdateBookingTypeData {
  name?: string;
  durationMinutes?: number;
  bufferMinutes?: number;
  minNoticeHours?: number;
  maxAdvanceDays?: number;
  timeZone?: string;
  weeklyHours?: { weekday: number; start: string; end: string }[];
  presentialCities?: { city: string; state?: string }[];
  active?: boolean;
}

export abstract class BookingTypesAdminRepository {
  abstract create(data: CreateBookingTypeData): Promise<BookingTypeRecord>;
  abstract update(id: string, data: UpdateBookingTypeData): Promise<BookingTypeRecord>;
  abstract listByOwner(ownerId: string): Promise<BookingTypeRecord[]>;
}
