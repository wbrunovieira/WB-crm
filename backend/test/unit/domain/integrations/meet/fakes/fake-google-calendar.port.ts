import {
  GoogleCalendarPort,
  CalendarEvent,
  CalendarAttendee,
  CreateCalendarEventOptions,
  CreateCalendarEventResult,
} from "@/domain/integrations/meet/application/ports/google-calendar.port";

export class FakeGoogleCalendarPort extends GoogleCalendarPort {
  public events: Map<string, CalendarEvent> = new Map();
  public createdEvents: CreateCalendarEventOptions[] = [];
  public cancelledEventIds: string[] = [];
  public updatedEvents: Array<{ googleEventId: string; opts: object }> = [];

  async getMeetEvent(googleEventId: string): Promise<CalendarEvent | null> {
    return this.events.get(googleEventId) ?? null;
  }

  async createMeetEvent(opts: CreateCalendarEventOptions): Promise<CreateCalendarEventResult> {
    this.createdEvents.push(opts);
    const googleEventId = `fake-event-${Date.now()}`;
    const attendees: CalendarAttendee[] = opts.attendeeEmails.map((email) => ({
      email,
      responseStatus: "needsAction",
    }));
    const result: CreateCalendarEventResult = { googleEventId, meetLink: `https://meet.google.com/fake-${googleEventId}`, attendees };
    this.events.set(googleEventId, { googleEventId, attendees });
    return result;
  }

  async cancelEvent(googleEventId: string): Promise<void> {
    this.cancelledEventIds.push(googleEventId);
    this.events.delete(googleEventId);
  }

  async updateEvent(
    googleEventId: string,
    opts: Partial<Omit<CreateCalendarEventOptions, "timeZone">> & { timeZone?: string },
  ): Promise<{ attendees: CalendarAttendee[] }> {
    this.updatedEvents.push({ googleEventId, opts });
    const event = this.events.get(googleEventId);
    return { attendees: event?.attendees ?? [] };
  }

  addEvent(event: CalendarEvent): void {
    this.events.set(event.googleEventId, event);
  }
}
