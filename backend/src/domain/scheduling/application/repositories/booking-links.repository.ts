export interface BookingLinkRecord {
  id: string;
  token: string;
  ownerId: string;
  bookingTypeId: string;
  leadId: string | null;
  contactId: string | null;
  partnerId: string | null;
  label: string | null;
  active: boolean;
  expiresAt: Date | null;
}

export abstract class BookingLinksRepository {
  abstract findByToken(token: string): Promise<BookingLinkRecord | null>;
  abstract findById(id: string): Promise<BookingLinkRecord | null>;
  /** The generic public link served at the token-less /book URL (isDefaultPublic). */
  abstract findDefaultPublic(): Promise<BookingLinkRecord | null>;
}
