import { describe, it, expect, beforeEach, vi } from "vitest";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ScheduleMeetingUseCase } from "@/domain/integrations/meet/application/use-cases/meetings-crud.use-cases";
import { FakeMeetingsRepository } from "../../fakes/fake-meetings.repository";
import { FakeGoogleCalendarPort } from "../../fakes/fake-google-calendar.port";
import { FakeGmailPort } from "@test/unit/domain/integrations/email/fakes/fake-gmail.port";

const OWNER = "user-001";
const ALIAS = "bruno@saltoup.com";
const ATTENDEE = "wbrunovieira77@gmail.com";
const FUTURE = new Date(Date.now() + 60 * 60 * 1000);
const END = new Date(FUTURE.getTime() + 60 * 60 * 1000);

let meetings: FakeMeetingsRepository;
let calendar: FakeGoogleCalendarPort;
let gmail: FakeGmailPort;
const fakeEmitter = { emit: vi.fn() } as unknown as EventEmitter2;

beforeEach(() => {
  meetings = new FakeMeetingsRepository();
  calendar = new FakeGoogleCalendarPort();
  gmail = new FakeGmailPort();
});

describe("ScheduleMeetingUseCase — organizerEmail alias (Option B)", () => {
  it("always uses sendUpdates=all so Google Calendar sends the native RSVP invite", async () => {
    const useCase = new ScheduleMeetingUseCase(meetings, calendar, fakeEmitter, gmail);

    await useCase.execute({
      title: "Reunião Saltoup",
      startAt: FUTURE,
      endAt: END,
      attendeeEmails: [ATTENDEE],
      organizerEmail: ALIAS,
      requesterId: OWNER,
    });

    expect(calendar.createdEvents[0].sendUpdates).toBe("all");
  });

  it("informational email uses Reply-To and Cc = alias (not From, to avoid Yahoo/SPF blocks)", async () => {
    const useCase = new ScheduleMeetingUseCase(meetings, calendar, fakeEmitter, gmail);

    await useCase.execute({
      title: "Reunião Saltoup",
      startAt: FUTURE,
      endAt: END,
      attendeeEmails: [ATTENDEE],
      organizerEmail: ALIAS,
      requesterId: OWNER,
    });

    expect(gmail.sentMessages).toHaveLength(1);
    expect(gmail.sentCalendarInvites).toHaveLength(0);

    const msg = gmail.sentMessages[0];
    expect(msg.to).toBe(ATTENDEE);
    // From is the primary account email (not the alias) so Yahoo/others don't block
    expect(msg.from).toBe(gmail.profileEmail);
    // Alias appears via Reply-To and Cc so client can see and reply to it
    expect(msg.replyTo).toBe(ALIAS);
    expect(msg.cc).toBe(ALIAS);
  });

  it("informational email body contains meeting title, date and Meet link", async () => {
    calendar.meetLink = "https://meet.google.com/abc-defg-hij";
    const useCase = new ScheduleMeetingUseCase(meetings, calendar, fakeEmitter, gmail);

    await useCase.execute({
      title: "Reunião Saltoup",
      startAt: FUTURE,
      endAt: END,
      attendeeEmails: [ATTENDEE],
      organizerEmail: ALIAS,
      requesterId: OWNER,
    });

    const body = gmail.sentMessages[0].bodyHtml;
    expect(body).toContain("Reunião Saltoup");
    expect(body).toContain("meet.google.com/abc-defg-hij");
    expect(body).toContain(ALIAS); // alias shown in signature
  });

  it("sends informational email to all attendees (not to the alias itself)", async () => {
    const useCase = new ScheduleMeetingUseCase(meetings, calendar, fakeEmitter, gmail);
    const SECOND = "outro@example.com";

    await useCase.execute({
      title: "Multi-attendee",
      startAt: FUTURE,
      endAt: END,
      attendeeEmails: [ATTENDEE, SECOND],
      organizerEmail: ALIAS,
      requesterId: OWNER,
    });

    const tos = gmail.sentMessages.map((m) => m.to);
    expect(tos).toContain(ATTENDEE);
    expect(tos).toContain(SECOND);
    expect(tos).not.toContain(ALIAS);
  });

  it("uses sendUpdates=all (default) when no organizerEmail is set and sends no email", async () => {
    const useCase = new ScheduleMeetingUseCase(meetings, calendar, fakeEmitter, gmail);

    await useCase.execute({
      title: "Reunião Normal",
      startAt: FUTURE,
      endAt: END,
      attendeeEmails: [ATTENDEE],
      requesterId: OWNER,
    });

    expect(calendar.createdEvents[0].sendUpdates).toBe("all");
    expect(gmail.sentMessages).toHaveLength(0);
    expect(gmail.sentCalendarInvites).toHaveLength(0);
  });

  it("meeting is still created even if Gmail informational email fails", async () => {
    gmail.shouldFailSend = true;
    const useCase = new ScheduleMeetingUseCase(meetings, calendar, fakeEmitter, gmail);

    const result = await useCase.execute({
      title: "Reunião Saltoup Falha",
      startAt: FUTURE,
      endAt: END,
      attendeeEmails: [ATTENDEE],
      organizerEmail: ALIAS,
      requesterId: OWNER,
    });

    expect(result.isRight()).toBe(true);
    expect(meetings.items).toHaveLength(1);
  });

  it("works without GmailPort — uses sendUpdates=all, no informational email", async () => {
    const useCase = new ScheduleMeetingUseCase(meetings, calendar, fakeEmitter);

    const result = await useCase.execute({
      title: "Sem Gmail",
      startAt: FUTURE,
      endAt: END,
      attendeeEmails: [ATTENDEE],
      organizerEmail: ALIAS,
      requesterId: OWNER,
    });

    expect(result.isRight()).toBe(true);
    expect(calendar.createdEvents[0].sendUpdates).toBe("all");
  });
});
