import { google } from "googleapis";
import { getAuthenticatedClient } from "./auth";
import { v4 as uuidv4 } from "uuid";

interface CreateMeetEventOptions {
  title: string;
  startAt: Date;
  endAt: Date;
  attendeeEmails: string[];
  description?: string;
  timeZone?: string;
}

interface CreateMeetEventResult {
  googleEventId: string;
  meetLink: string | null;
}

export async function createMeetEvent(
  opts: CreateMeetEventOptions
): Promise<CreateMeetEventResult> {
  const auth = await getAuthenticatedClient();
  const calendar = google.calendar({ version: "v3", auth });

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
          requestId: uuidv4(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  return {
    googleEventId: data.id!,
    meetLink: data.hangoutLink ?? null,
  };
}

export async function cancelMeetEvent(googleEventId: string): Promise<void> {
  const auth = await getAuthenticatedClient();
  const calendar = google.calendar({ version: "v3", auth });

  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId: googleEventId,
      sendUpdates: "all",
    });
  } catch (err) {
    // 404 = event already deleted/not found — treat as success
    if ((err as { code?: number }).code === 404) return;
    throw err;
  }
}

export async function getMeetEvent(googleEventId: string) {
  const auth = await getAuthenticatedClient();
  const calendar = google.calendar({ version: "v3", auth });

  const { data } = await calendar.events.get({
    calendarId: "primary",
    eventId: googleEventId,
  });

  return data;
}
