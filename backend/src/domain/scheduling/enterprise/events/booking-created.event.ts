/**
 * Emitted (EventEmitter2, "booking.created") after a public booking is scheduled.
 * Lets a listener alert the link owner (the host) via bell + email — Google Calendar
 * never emails the organizer, so without this the host learns nothing by email.
 */
export interface BookingCreatedPayload {
  ownerId: string; // the booking link owner = the host to notify
  attendeeName: string; // who booked
  startAtISO: string;
  timeZone: string;
  meetingId: string;
  meetLink: string | null;
  mode: "online" | "presential";
}

export class BookingCreatedEvent {
  constructor(public readonly payload: BookingCreatedPayload) {}
}

export const BOOKING_CREATED_EVENT = "booking.created";
