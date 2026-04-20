import { Injectable, Logger } from "@nestjs/common";
import { google } from "googleapis";
import { PrismaService } from "@/infra/database/prisma.service";
import { GoogleCalendarPort, CalendarEvent } from "../application/ports/google-calendar.port";

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
      const attendees = (event.attendees ?? []).map((a) => ({
        email: a.email!,
        displayName: a.displayName ?? undefined,
        responseStatus: (a.responseStatus ?? "needsAction") as CalendarEvent["attendees"][number]["responseStatus"],
      }));

      return { googleEventId, attendees };
    } catch (err) {
      this.logger.warn(`getMeetEvent failed for ${googleEventId}`, err);
      return null;
    }
  }
}
