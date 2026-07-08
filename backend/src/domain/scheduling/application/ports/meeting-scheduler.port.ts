export interface ScheduleBookingInput {
  ownerId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  attendeeEmail: string;
  attendeeName: string;
  leadId: string | null;
  contactId: string | null;
  partnerId: string | null;
  mode: "online" | "presential";
  location: string | null; // endereço (presencial)
  manageToken: string;
  bookingLinkId: string;
}

export interface BookedMeetingRef {
  meetingId: string;
  bookingLinkId: string | null;
  status: string; // scheduled | ended | cancelled
  startAt: Date;
}

/** Cria/remarca/cancela a reunião reutilizando o módulo `meet` (Google + confirmação). */
export abstract class MeetingSchedulerPort {
  abstract schedule(input: ScheduleBookingInput): Promise<{ meetingId: string; meetLink: string | null }>;
  abstract findByManageToken(manageToken: string): Promise<BookedMeetingRef | null>;
  abstract reschedule(meetingId: string, startAt: Date, endAt: Date): Promise<void>;
  abstract cancel(meetingId: string): Promise<void>;
}
