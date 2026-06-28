import { BookingLinkRecord } from "./booking-links.repository";

export interface CreateBookingLinkData {
  token: string;
  ownerId: string;
  bookingTypeId: string;
  leadId?: string | null;
  contactId?: string | null;
  label?: string | null;
}

export abstract class BookingLinksAdminRepository {
  abstract create(data: CreateBookingLinkData): Promise<BookingLinkRecord>;
}
