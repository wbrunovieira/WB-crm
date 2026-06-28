import { Injectable } from "@nestjs/common";
import { google } from "googleapis";
import { PrismaService } from "@/infra/database/prisma.service";
import { CalendarFreeBusyPort } from "../application/ports/calendar-freebusy.port";
import { Interval } from "../enterprise/services/availability.service";

@Injectable()
export class GoogleFreeBusyAdapter extends CalendarFreeBusyPort {
  constructor(private readonly prisma: PrismaService) { super(); }

  async getBusy(_ownerId: string, from: Date, to: Date): Promise<Interval[]> {
    const token = await this.prisma.googleToken.findFirst();
    if (!token) return [];
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ access_token: token.accessToken, refresh_token: token.refreshToken });
    const calendar = google.calendar({ version: "v3", auth });
    const res = await calendar.freebusy.query({
      requestBody: { timeMin: from.toISOString(), timeMax: to.toISOString(), items: [{ id: "primary" }] },
    });
    const busy = res.data.calendars?.["primary"]?.busy ?? [];
    return busy
      .filter((b) => b.start && b.end)
      .map((b) => ({ start: new Date(b.start!), end: new Date(b.end!) }));
  }
}
