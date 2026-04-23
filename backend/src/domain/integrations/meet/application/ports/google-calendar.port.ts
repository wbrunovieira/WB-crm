export interface CalendarAttendee {
  email: string;
  displayName?: string;
  responseStatus: "needsAction" | "accepted" | "declined" | "tentative";
}

export interface CalendarEvent {
  googleEventId: string;
  attendees: CalendarAttendee[];
}

export interface CreateCalendarEventOptions {
  title: string;
  startAt: Date;
  endAt: Date;
  attendeeEmails: string[];
  description?: string;
  timeZone?: string;
  organizerEmail?: string;
  sendUpdates?: "all" | "externalOnly" | "none";
}

export interface CreateCalendarEventResult {
  googleEventId: string;
  meetLink: string | null;
  attendees: CalendarAttendee[];
}

export abstract class GoogleCalendarPort {
  abstract getMeetEvent(googleEventId: string): Promise<CalendarEvent | null>;
  abstract createMeetEvent(opts: CreateCalendarEventOptions): Promise<CreateCalendarEventResult>;
  abstract cancelEvent(googleEventId: string): Promise<void>;
  abstract updateEvent(
    googleEventId: string,
    opts: Partial<Omit<CreateCalendarEventOptions, "timeZone">> & { timeZone?: string },
  ): Promise<{ attendees: CalendarAttendee[] }>;
}
