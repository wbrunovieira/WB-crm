export interface CalendarAttendee {
  email: string;
  displayName?: string;
  responseStatus: "needsAction" | "accepted" | "declined" | "tentative";
}

export interface CalendarEvent {
  googleEventId: string;
  attendees: CalendarAttendee[];
}

export abstract class GoogleCalendarPort {
  abstract getMeetEvent(googleEventId: string): Promise<CalendarEvent | null>;
}
