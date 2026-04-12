/**
 * Google Calendar Tests
 *
 * Tests for src/lib/google/calendar.ts
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/google/auth", () => ({
  getAuthenticatedClient: vi.fn(),
}));

vi.mock("googleapis", () => {
  const calendarClientMock = {
    events: {
      insert: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
    },
  };

  return {
    google: {
      calendar: vi.fn(() => calendarClientMock),
      auth: { OAuth2: vi.fn() },
    },
    __calendarClientMock: calendarClientMock,
  };
});

import { google } from "googleapis";
import { getAuthenticatedClient } from "@/lib/google/auth";
import {
  createMeetEvent,
  cancelMeetEvent,
  getMeetEvent,
} from "@/lib/google/calendar";

const mockGetAuthenticatedClient = vi.mocked(getAuthenticatedClient);

function getCalendarMock() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (google.calendar as any)() as ReturnType<typeof makeCalendarClient>;
}

function makeCalendarClient() {
  return {
    events: {
      insert: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAuthenticatedClient.mockResolvedValue({} as never);
});

// ---------------------------------------------------------------------------
describe("createMeetEvent", () => {
  it("cria evento no Google Calendar com Meet link", async () => {
    const cal = getCalendarMock();
    cal.events.insert.mockResolvedValue({
      data: {
        id: "event-abc123",
        hangoutLink: "https://meet.google.com/abc-defg-hij",
        summary: "Reunião WB",
        start: { dateTime: "2026-04-15T10:00:00-03:00" },
        end: { dateTime: "2026-04-15T11:00:00-03:00" },
        attendees: [
          { email: "cliente@empresa.com", responseStatus: "needsAction" },
          { email: "user@wbdigital.com", responseStatus: "accepted", self: true },
        ],
      },
    });

    const result = await createMeetEvent({
      title: "Reunião WB",
      startAt: new Date("2026-04-15T10:00:00-03:00"),
      endAt: new Date("2026-04-15T11:00:00-03:00"),
      attendeeEmails: ["cliente@empresa.com", "user@wbdigital.com"],
      description: "Reunião de apresentação da proposta",
      timeZone: "America/Sao_Paulo",
    });

    expect(cal.events.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: "primary",
        conferenceDataVersion: 1,
        requestBody: expect.objectContaining({
          summary: "Reunião WB",
          attendees: expect.arrayContaining([
            { email: "cliente@empresa.com" },
            { email: "user@wbdigital.com" },
          ]),
          conferenceData: expect.objectContaining({
            createRequest: expect.objectContaining({
              conferenceSolutionKey: { type: "hangoutsMeet" },
            }),
          }),
        }),
      })
    );

    expect(result).toMatchObject({
      googleEventId: "event-abc123",
      meetLink: "https://meet.google.com/abc-defg-hij",
    });

    // Should return attendees with RSVP status
    expect(result.attendees).toHaveLength(2);
    expect(result.attendees[0]).toMatchObject({
      email: "cliente@empresa.com",
      responseStatus: "needsAction",
    });
    expect(result.attendees[1]).toMatchObject({
      email: "user@wbdigital.com",
      responseStatus: "accepted",
      self: true,
    });
  });

  it("lança erro se insert falhar", async () => {
    const cal = getCalendarMock();
    cal.events.insert.mockRejectedValue(new Error("Google Calendar API error"));

    await expect(
      createMeetEvent({
        title: "Reunião",
        startAt: new Date(),
        endAt: new Date(),
        attendeeEmails: ["test@test.com"],
      })
    ).rejects.toThrow("Google Calendar API error");
  });
});

// ---------------------------------------------------------------------------
describe("cancelMeetEvent", () => {
  it("cancela evento do Google Calendar", async () => {
    const cal = getCalendarMock();
    cal.events.delete.mockResolvedValue({ data: {} });

    await cancelMeetEvent("event-abc123");

    expect(cal.events.delete).toHaveBeenCalledWith({
      calendarId: "primary",
      eventId: "event-abc123",
      sendUpdates: "all",
    });
  });

  it("não lança erro se evento já foi removido (404)", async () => {
    const cal = getCalendarMock();
    const err = Object.assign(new Error("Not Found"), { code: 404 });
    cal.events.delete.mockRejectedValue(err);

    // Should not throw for 404
    await expect(cancelMeetEvent("event-abc123")).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
describe("getMeetEvent", () => {
  it("retorna dados do evento pelo googleEventId", async () => {
    const cal = getCalendarMock();
    cal.events.get.mockResolvedValue({
      data: {
        id: "event-abc123",
        summary: "Reunião WB",
        hangoutLink: "https://meet.google.com/abc-defg-hij",
        status: "confirmed",
        start: { dateTime: "2026-04-15T10:00:00-03:00" },
        end: { dateTime: "2026-04-15T11:00:00-03:00" },
      },
    });

    const result = await getMeetEvent("event-abc123");

    expect(cal.events.get).toHaveBeenCalledWith({
      calendarId: "primary",
      eventId: "event-abc123",
    });
    expect(result).toMatchObject({
      id: "event-abc123",
      status: "confirmed",
    });
  });
});
