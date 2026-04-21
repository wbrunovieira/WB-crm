import { Injectable, Logger } from "@nestjs/common";
import { google } from "googleapis";
import { randomUUID } from "crypto";
import { PrismaService } from "@/infra/database/prisma.service";
import {
  GoogleCalendarPort,
  CalendarEvent,
  CalendarAttendee,
  CreateCalendarEventOptions,
  CreateCalendarEventResult,
} from "../application/ports/google-calendar.port";

@Injectable()
export class GoogleCalendarClient extends GoogleCalendarPort {
  private readonly logger = new Logger(GoogleCalendarClient.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private async getCalendarClient() {
    const token = await this.prisma.googleToken.findFirst();
    if (!token) throw new Error("Google token not configured");

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
    auth.setCredentials({ access_token: token.accessToken });
    return google.calendar({ version: "v3", auth });
  }

  async getMeetEvent(googleEventId: string): Promise<CalendarEvent | null> {
    try {
      const calendar = await this.getCalendarClient();
      const res = await calendar.events.get({
        calendarId: "primary",
        eventId: googleEventId,
      });

      const event = res.data;
      const attendees = this.mapAttendees(event.attendees ?? []);
      return { googleEventId, attendees };
    } catch (err) {
      this.logger.warn(`getMeetEvent failed for ${googleEventId}`, err);
      return null;
    }
  }

  async createMeetEvent(opts: CreateCalendarEventOptions): Promise<CreateCalendarEventResult> {
    const calendar = await this.getCalendarClient();
    const tz = opts.timeZone ?? "America/Sao_Paulo";

    const { data } = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      sendUpdates: "all",
      requestBody: {
        summary: opts.title,
        description: opts.description,
        start: { dateTime: opts.startAt.toISOString(), timeZone: tz },
        end: { dateTime: opts.endAt.toISOString(), timeZone: tz },
        attendees: opts.attendeeEmails.map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });

    return {
      googleEventId: data.id!,
      meetLink: data.hangoutLink ?? null,
      attendees: this.mapAttendees(data.attendees ?? []),
    };
  }

  async cancelEvent(googleEventId: string): Promise<void> {
    try {
      const calendar = await this.getCalendarClient();
      await calendar.events.delete({
        calendarId: "primary",
        eventId: googleEventId,
        sendUpdates: "all",
      });
    } catch (err) {
      if ((err as { code?: number }).code === 404) return;
      throw err;
    }
  }

  async updateEvent(
    googleEventId: string,
    opts: Partial<Omit<CreateCalendarEventOptions, "timeZone">> & { timeZone?: string },
  ): Promise<{ attendees: CalendarAttendee[] }> {
    const calendar = await this.getCalendarClient();
    const tz = opts.timeZone ?? "America/Sao_Paulo";

    const requestBody: Record<string, unknown> = {};
    if (opts.title) requestBody.summary = opts.title;
    if (opts.description !== undefined) requestBody.description = opts.description;
    if (opts.startAt) requestBody.start = { dateTime: opts.startAt.toISOString(), timeZone: tz };
    if (opts.endAt) requestBody.end = { dateTime: opts.endAt.toISOString(), timeZone: tz };
    if (opts.attendeeEmails) requestBody.attendees = opts.attendeeEmails.map((email) => ({ email }));

    const { data } = await calendar.events.patch({
      calendarId: "primary",
      eventId: googleEventId,
      sendUpdates: "all",
      requestBody,
    });

    return { attendees: this.mapAttendees(data.attendees ?? []) };
  }

  private mapAttendees(
    raw: Array<{ email?: string | null; displayName?: string | null; responseStatus?: string | null }>,
  ): CalendarAttendee[] {
    return raw.map((a) => ({
      email: a.email!,
      displayName: a.displayName ?? undefined,
      responseStatus: (a.responseStatus ?? "needsAction") as CalendarAttendee["responseStatus"],
    }));
  }
}
