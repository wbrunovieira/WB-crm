import { describe, it, expect, beforeEach } from "vitest";
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

beforeEach(() => {
  meetings = new FakeMeetingsRepository();
  calendar = new FakeGoogleCalendarPort();
  gmail = new FakeGmailPort();
});

describe("ScheduleMeetingUseCase — organizerEmail alias", () => {
  it("uses sendUpdates=none when organizerEmail is set (Calendar won't auto-send)", async () => {
    const useCase = new ScheduleMeetingUseCase(meetings, calendar, gmail);

    await useCase.execute({
      title: "Reunião Saltoup",
      startAt: FUTURE,
      endAt: END,
      attendeeEmails: [ATTENDEE],
      organizerEmail: ALIAS,
      requesterId: OWNER,
    });

    expect(calendar.createdEvents[0].sendUpdates).toBe("none");
  });

  it("sends calendar invite via Gmail from the alias to each attendee", async () => {
    const useCase = new ScheduleMeetingUseCase(meetings, calendar, gmail);

    await useCase.execute({
      title: "Reunião Saltoup",
      startAt: FUTURE,
      endAt: END,
      attendeeEmails: [ATTENDEE],
      organizerEmail: ALIAS,
      requesterId: OWNER,
    });

    expect(gmail.sentCalendarInvites).toHaveLength(1);
    expect(gmail.sentCalendarInvites[0].to).toBe(ATTENDEE);
    expect(gmail.sentCalendarInvites[0].from).toBe(ALIAS);
    expect(gmail.sentCalendarInvites[0].organizerEmail).toBe(ALIAS);
  });

  it("sends invite to all attendees (excluding the alias itself)", async () => {
    const useCase = new ScheduleMeetingUseCase(meetings, calendar, gmail);
    const SECOND = "outro@example.com";

    await useCase.execute({
      title: "Multi-attendee",
      startAt: FUTURE,
      endAt: END,
      attendeeEmails: [ATTENDEE, SECOND],
      organizerEmail: ALIAS,
      requesterId: OWNER,
    });

    const tos = gmail.sentCalendarInvites.map((i) => i.to);
    expect(tos).toContain(ATTENDEE);
    expect(tos).toContain(SECOND);
    expect(tos).not.toContain(ALIAS);
  });

  it("uses sendUpdates=all (default) when no organizerEmail is set", async () => {
    const useCase = new ScheduleMeetingUseCase(meetings, calendar, gmail);

    await useCase.execute({
      title: "Reunião Normal",
      startAt: FUTURE,
      endAt: END,
      attendeeEmails: [ATTENDEE],
      requesterId: OWNER,
    });

    expect(calendar.createdEvents[0].sendUpdates).toBe("all");
    expect(gmail.sentCalendarInvites).toHaveLength(0);
  });

  it("meeting is still created even if Gmail invite fails", async () => {
    gmail.shouldFailSend = true;
    const useCase = new ScheduleMeetingUseCase(meetings, calendar, gmail);

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

  it("works without GmailPort (backward compat — uses sendUpdates=all)", async () => {
    const useCase = new ScheduleMeetingUseCase(meetings, calendar);

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
