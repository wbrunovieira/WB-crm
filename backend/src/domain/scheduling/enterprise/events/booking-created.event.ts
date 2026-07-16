/**
 * Emitted (EventEmitter2, "booking.created") after a public booking is scheduled.
 * Carries everything two listeners need:
 *  - alert the link owner (host) via bell + email (Google never emails the organizer);
 *  - send the attendee a branded confirmation email in the language they booked in.
 */
export interface BookingCreatedPayload {
  ownerId: string; // the booking link owner = the host to notify
  attendeeName: string;
  attendeeEmail: string;
  attendeeWhatsapp: string | null;
  title: string;
  startAtISO: string;
  endAtISO: string;
  timeZone: string; // booking type tz — used for the host-facing email
  attendeeTimeZone: string; // the visitor's tz — used for the attendee email
  lang: string; // pt | en | es | it — the language the attendee booked in
  meetingId: string;
  meetLink: string | null;
  mode: "online" | "presential";
  location: string | null;
}

export class BookingCreatedEvent {
  constructor(public readonly payload: BookingCreatedPayload) {}
}

export const BOOKING_CREATED_EVENT = "booking.created";
