import { GoogleCalendarPort, CalendarEvent } from "@/domain/integrations/meet/application/ports/google-calendar.port";

export class FakeGoogleCalendarPort extends GoogleCalendarPort {
  public events: Map<string, CalendarEvent> = new Map();

  async getMeetEvent(googleEventId: string): Promise<CalendarEvent | null> {
    return this.events.get(googleEventId) ?? null;
  }

  addEvent(event: CalendarEvent): void {
    this.events.set(event.googleEventId, event);
  }
}
