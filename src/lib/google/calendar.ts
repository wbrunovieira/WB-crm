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

export interface MeetAttendee {
  email: string;
  /** needsAction | accepted | declined | tentative */
  responseStatus: "needsAction" | "accepted" | "declined" | "tentative";
  organizer?: boolean;
  self?: boolean;
}

interface CreateMeetEventResult {
  googleEventId: string;
  meetLink: string | null;
  attendees: MeetAttendee[];
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

  const attendees: MeetAttendee[] = (data.attendees ?? []).map((a) => ({
    email: a.email!,
    responseStatus: (a.responseStatus ?? "needsAction") as MeetAttendee["responseStatus"],
    organizer: a.organizer ?? false,
    self: a.self ?? false,
  }));

  return {
    googleEventId: data.id!,
    meetLink: data.hangoutLink ?? null,
    attendees,
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

export async function updateMeetEvent(
  googleEventId: string,
  opts: Partial<Omit<CreateMeetEventOptions, "timeZone">> & { timeZone?: string }
): Promise<{ attendees: MeetAttendee[] }> {
  const auth = await getAuthenticatedClient();
  const calendar = google.calendar({ version: "v3", auth });

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

  const attendees: MeetAttendee[] = (data.attendees ?? []).map((a) => ({
    email: a.email!,
    responseStatus: (a.responseStatus ?? "needsAction") as MeetAttendee["responseStatus"],
    organizer: a.organizer ?? false,
    self: a.self ?? false,
  }));

  return { attendees };
}

/** Extracts the attendee list with RSVP statuses from a raw Calendar event */
export function extractAttendees(
  event: Awaited<ReturnType<typeof getMeetEvent>>
): MeetAttendee[] {
  return (event.attendees ?? []).map((a) => ({
    email: a.email!,
    responseStatus: (a.responseStatus ?? "needsAction") as MeetAttendee["responseStatus"],
    organizer: a.organizer ?? false,
    self: a.self ?? false,
  }));
}
