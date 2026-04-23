import { describe, it, expect, beforeEach } from "vitest";
import {
  GetMeetingsUseCase,
  GetMeetingByIdUseCase,
  CheckMeetingTitleUseCase,
  UpdateMeetingSummaryUseCase,
  ScheduleMeetingUseCase,
  UpdateMeetingUseCase,
  CancelMeetingUseCase,
  MeetingNotFoundError,
  MeetingForbiddenError,
} from "@/domain/integrations/meet/application/use-cases/meetings-crud.use-cases";
import { FakeMeetingsRepository } from "../../fakes/fake-meetings.repository";
import { FakeGoogleCalendarPort } from "../../fakes/fake-google-calendar.port";

const OWNER = "user-001";
const OTHER = "user-002";
const FUTURE = new Date(Date.now() + 60 * 60 * 1000);

let meetings: FakeMeetingsRepository;
let calendar: FakeGoogleCalendarPort;

beforeEach(() => {
  meetings = new FakeMeetingsRepository();
  calendar = new FakeGoogleCalendarPort();
});

// ---------------------------------------------------------------------------
// GetMeetingsUseCase
// ---------------------------------------------------------------------------
describe("GetMeetingsUseCase", () => {
  it("returns meetings owned by the requester", async () => {
    const useCase = new GetMeetingsUseCase(meetings);
    meetings.addMeeting({ id: "m1", title: "Reunião A", startAt: FUTURE, status: "scheduled", ownerId: OWNER });
    meetings.addMeeting({ id: "m2", title: "Reunião B", startAt: FUTURE, status: "scheduled", ownerId: OTHER });

    const result = await useCase.execute({ requesterId: OWNER });

    expect(result.isRight()).toBe(true);
    expect(result.value).toHaveLength(1);
    expect(result.value[0].id).toBe("m1");
  });

  it("returns empty array when owner has no meetings", async () => {
    const useCase = new GetMeetingsUseCase(meetings);

    const result = await useCase.execute({ requesterId: OWNER });

    expect(result.isRight()).toBe(true);
    expect(result.value).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// GetMeetingByIdUseCase
// ---------------------------------------------------------------------------
describe("GetMeetingByIdUseCase", () => {
  it("returns the meeting when found and owned by requester", async () => {
    const useCase = new GetMeetingByIdUseCase(meetings);
    meetings.addMeeting({ id: "m1", title: "Reunião A", startAt: FUTURE, status: "scheduled", ownerId: OWNER });

    const result = await useCase.execute({ id: "m1", requesterId: OWNER });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().id).toBe("m1");
  });

  it("returns MeetingNotFoundError when meeting does not exist", async () => {
    const useCase = new GetMeetingByIdUseCase(meetings);

    const result = await useCase.execute({ id: "nonexistent", requesterId: OWNER });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(MeetingNotFoundError);
  });

  it("returns MeetingForbiddenError when meeting belongs to another user", async () => {
    const useCase = new GetMeetingByIdUseCase(meetings);
    meetings.addMeeting({ id: "m1", title: "Reunião Alheia", startAt: FUTURE, status: "scheduled", ownerId: OTHER });

    const result = await useCase.execute({ id: "m1", requesterId: OWNER });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(MeetingForbiddenError);
  });
});

// ---------------------------------------------------------------------------
// CheckMeetingTitleUseCase
// ---------------------------------------------------------------------------
describe("CheckMeetingTitleUseCase", () => {
  it("returns exists=false when title is not taken", async () => {
    const useCase = new CheckMeetingTitleUseCase(meetings);

    const result = await useCase.execute({ requesterId: OWNER, title: "Reunião Nova" });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().exists).toBe(false);
  });

  it("returns exists=true when title is already in use", async () => {
    const useCase = new CheckMeetingTitleUseCase(meetings);
    // Fake always returns false; override for this test
    meetings.titleExistsByOwner = async () => true;

    const result = await useCase.execute({ requesterId: OWNER, title: "Reunião Existente" });

    expect(result.unwrap().exists).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// UpdateMeetingSummaryUseCase
// ---------------------------------------------------------------------------
describe("UpdateMeetingSummaryUseCase", () => {
  it("updates summary when meeting exists and belongs to requester", async () => {
    const useCase = new UpdateMeetingSummaryUseCase(meetings);
    meetings.addMeeting({ id: "m1", title: "Reunião A", startAt: FUTURE, status: "scheduled", ownerId: OWNER });

    const result = await useCase.execute({ id: "m1", requesterId: OWNER, summary: "Novo resumo" });

    expect(result.isRight()).toBe(true);
    expect(meetings.items[0].meetingSummary).toBe("Novo resumo");
  });

  it("clears summary when null is passed", async () => {
    const useCase = new UpdateMeetingSummaryUseCase(meetings);
    meetings.addMeeting({ id: "m1", title: "Reunião A", startAt: FUTURE, status: "scheduled", ownerId: OWNER, meetingSummary: "Antigo" });

    const result = await useCase.execute({ id: "m1", requesterId: OWNER, summary: null });

    expect(result.isRight()).toBe(true);
    expect(meetings.items[0].meetingSummary).toBeNull();
  });

  it("returns MeetingNotFoundError when meeting does not exist", async () => {
    const useCase = new UpdateMeetingSummaryUseCase(meetings);

    const result = await useCase.execute({ id: "nonexistent", requesterId: OWNER, summary: "x" });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(MeetingNotFoundError);
  });

  it("returns MeetingForbiddenError when meeting belongs to another user", async () => {
    const useCase = new UpdateMeetingSummaryUseCase(meetings);
    meetings.addMeeting({ id: "m1", title: "Reunião Alheia", startAt: FUTURE, status: "scheduled", ownerId: OTHER });

    const result = await useCase.execute({ id: "m1", requesterId: OWNER, summary: "x" });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(MeetingForbiddenError);
  });
});

// ---------------------------------------------------------------------------
// ScheduleMeetingUseCase
// ---------------------------------------------------------------------------
describe("ScheduleMeetingUseCase", () => {
  it("creates a meeting and syncs with Google Calendar", async () => {
    const useCase = new ScheduleMeetingUseCase(meetings, calendar);

    const result = await useCase.execute({
      title: "Nova Reunião",
      startAt: FUTURE,
      attendeeEmails: ["a@test.com"],
      requesterId: OWNER,
    });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().title).toBe("Nova Reunião");
    expect(result.unwrap().googleEventId).toBeDefined();
    expect(result.unwrap().meetLink).toContain("meet.google.com");
    expect(calendar.createdEvents).toHaveLength(1);
  });

  it("creates meeting without Calendar when skipCalendar=true", async () => {
    const useCase = new ScheduleMeetingUseCase(meetings, calendar);

    const result = await useCase.execute({
      title: "Reunião Offline",
      startAt: FUTURE,
      attendeeEmails: [],
      requesterId: OWNER,
      skipCalendar: true,
    });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().googleEventId).toBeNull();
    expect(calendar.createdEvents).toHaveLength(0);
  });

  it("creates meeting even when Calendar throws (non-fatal)", async () => {
    const useCase = new ScheduleMeetingUseCase(meetings, calendar);
    calendar.createMeetEvent = async () => { throw new Error("Calendar unavailable"); };

    const result = await useCase.execute({
      title: "Reunião Sem Calendário",
      startAt: FUTURE,
      attendeeEmails: ["a@test.com"],
      requesterId: OWNER,
    });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().googleEventId).toBeNull();
    expect(meetings.items).toHaveLength(1);
  });

  it("returns error when title is empty", async () => {
    const useCase = new ScheduleMeetingUseCase(meetings, calendar);

    const result = await useCase.execute({
      title: "   ",
      startAt: FUTURE,
      attendeeEmails: [],
      requesterId: OWNER,
    });

    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toMatch(/título|title/i);
  });

  it("defaults endAt to startAt + 1 hour when not provided", async () => {
    const useCase = new ScheduleMeetingUseCase(meetings, calendar);

    await useCase.execute({
      title: "Reunião Curta",
      startAt: FUTURE,
      attendeeEmails: [],
      requesterId: OWNER,
    });

    const opts = calendar.createdEvents[0];
    expect(opts.endAt.getTime()).toBeCloseTo(FUTURE.getTime() + 60 * 60 * 1000, -3);
  });

  it("trims whitespace from title", async () => {
    const useCase = new ScheduleMeetingUseCase(meetings, calendar);

    const result = await useCase.execute({
      title: "  Reunião Espaçada  ",
      startAt: FUTURE,
      attendeeEmails: [],
      requesterId: OWNER,
      skipCalendar: true,
    });

    expect(result.unwrap().title).toBe("Reunião Espaçada");
  });

  it("stores organizerEmail separately (not duplicated in attendees)", async () => {
    const useCase = new ScheduleMeetingUseCase(meetings, calendar);

    const result = await useCase.execute({
      title: "Reunião Salto",
      startAt: FUTURE,
      attendeeEmails: ["client@example.com"],
      organizerEmail: "bruno@saltoup.com",
      requesterId: OWNER,
    });

    expect(result.isRight()).toBe(true);
    const created = result.unwrap();
    const sentEmails = JSON.parse(created.attendeeEmails) as string[];
    // organizerEmail is the sender — not added to attendees list (they'd receive via iCal ORGANIZER field)
    expect(sentEmails).toContain("client@example.com");
    expect(sentEmails).not.toContain("bruno@saltoup.com");
    expect(created.organizerEmail).toBe("bruno@saltoup.com");
  });

  it("does not duplicate organizerEmail when already in attendees", async () => {
    const useCase = new ScheduleMeetingUseCase(meetings, calendar);

    const result = await useCase.execute({
      title: "Reunião Sem Duplicata",
      startAt: FUTURE,
      attendeeEmails: ["bruno@saltoup.com", "client@example.com"],
      organizerEmail: "bruno@saltoup.com",
      requesterId: OWNER,
    });

    expect(result.isRight()).toBe(true);
    const sentEmails = JSON.parse(result.unwrap().attendeeEmails) as string[];
    const count = sentEmails.filter((e) => e === "bruno@saltoup.com").length;
    expect(count).toBe(1);
  });

  it("saves organizerEmail as null when not provided", async () => {
    const useCase = new ScheduleMeetingUseCase(meetings, calendar);

    const result = await useCase.execute({
      title: "Reunião WB",
      startAt: FUTURE,
      attendeeEmails: ["client@example.com"],
      requesterId: OWNER,
      skipCalendar: true,
    });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().organizerEmail).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// UpdateMeetingUseCase
// ---------------------------------------------------------------------------
describe("UpdateMeetingUseCase", () => {
  it("updates title and syncs Google Calendar", async () => {
    const useCase = new UpdateMeetingUseCase(meetings, calendar);
    meetings.addMeeting({ id: "m1", title: "Reunião Antiga", startAt: FUTURE, status: "scheduled", ownerId: OWNER, googleEventId: "gcal-001" });
    calendar.addEvent({ googleEventId: "gcal-001", attendees: [] });

    const result = await useCase.execute({ id: "m1", requesterId: OWNER, title: "Reunião Nova" });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().title).toBe("Reunião Nova");
    expect(calendar.updatedEvents).toHaveLength(1);
    expect(calendar.updatedEvents[0].googleEventId).toBe("gcal-001");
  });

  it("updates meeting without Calendar call when no googleEventId", async () => {
    const useCase = new UpdateMeetingUseCase(meetings, calendar);
    meetings.addMeeting({ id: "m1", title: "Reunião Local", startAt: FUTURE, status: "scheduled", ownerId: OWNER, googleEventId: null });

    const result = await useCase.execute({ id: "m1", requesterId: OWNER, title: "Reunião Local Atualizada" });

    expect(result.isRight()).toBe(true);
    expect(calendar.updatedEvents).toHaveLength(0);
  });

  it("proceeds with DB update even when Calendar throws", async () => {
    const useCase = new UpdateMeetingUseCase(meetings, calendar);
    meetings.addMeeting({ id: "m1", title: "Reunião A", startAt: FUTURE, status: "scheduled", ownerId: OWNER, googleEventId: "gcal-001" });
    calendar.updateEvent = async () => { throw new Error("Calendar down"); };

    const result = await useCase.execute({ id: "m1", requesterId: OWNER, title: "Novo Título" });

    expect(result.isRight()).toBe(true);
    expect(meetings.items[0].title).toBe("Novo Título");
  });

  it("returns MeetingNotFoundError when meeting does not exist", async () => {
    const useCase = new UpdateMeetingUseCase(meetings, calendar);

    const result = await useCase.execute({ id: "nonexistent", requesterId: OWNER });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(MeetingNotFoundError);
  });

  it("returns MeetingForbiddenError when meeting belongs to another user", async () => {
    const useCase = new UpdateMeetingUseCase(meetings, calendar);
    meetings.addMeeting({ id: "m1", title: "Reunião Alheia", startAt: FUTURE, status: "scheduled", ownerId: OTHER });

    const result = await useCase.execute({ id: "m1", requesterId: OWNER });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(MeetingForbiddenError);
  });
});

// ---------------------------------------------------------------------------
// CancelMeetingUseCase
// ---------------------------------------------------------------------------
describe("CancelMeetingUseCase", () => {
  it("cancels meeting and deletes Google Calendar event", async () => {
    const useCase = new CancelMeetingUseCase(meetings, calendar);
    meetings.addMeeting({ id: "m1", title: "Reunião A", startAt: FUTURE, status: "scheduled", ownerId: OWNER, googleEventId: "gcal-001" });
    calendar.addEvent({ googleEventId: "gcal-001", attendees: [] });

    const result = await useCase.execute({ id: "m1", requesterId: OWNER });

    expect(result.isRight()).toBe(true);
    expect(meetings.items[0].status).toBe("cancelled");
    expect(calendar.cancelledEventIds).toContain("gcal-001");
  });

  it("cancels meeting without Calendar call when no googleEventId", async () => {
    const useCase = new CancelMeetingUseCase(meetings, calendar);
    meetings.addMeeting({ id: "m1", title: "Reunião Local", startAt: FUTURE, status: "scheduled", ownerId: OWNER, googleEventId: null });

    const result = await useCase.execute({ id: "m1", requesterId: OWNER });

    expect(result.isRight()).toBe(true);
    expect(meetings.items[0].status).toBe("cancelled");
    expect(calendar.cancelledEventIds).toHaveLength(0);
  });

  it("proceeds with DB cancellation even when Calendar throws", async () => {
    const useCase = new CancelMeetingUseCase(meetings, calendar);
    meetings.addMeeting({ id: "m1", title: "Reunião A", startAt: FUTURE, status: "scheduled", ownerId: OWNER, googleEventId: "gcal-001" });
    calendar.cancelEvent = async () => { throw new Error("Calendar down"); };

    const result = await useCase.execute({ id: "m1", requesterId: OWNER });

    expect(result.isRight()).toBe(true);
    expect(meetings.items[0].status).toBe("cancelled");
  });

  it("skips linked activity when activityId is set", async () => {
    const useCase = new CancelMeetingUseCase(meetings, calendar);
    const skipped: string[] = [];
    meetings.skipActivity = async (id) => { skipped.push(id); };
    meetings.addMeeting({ id: "m1", title: "Reunião A", startAt: FUTURE, status: "scheduled", ownerId: OWNER, activityId: "act-001" });

    await useCase.execute({ id: "m1", requesterId: OWNER });

    expect(skipped).toContain("act-001");
  });

  it("returns MeetingNotFoundError when meeting does not exist", async () => {
    const useCase = new CancelMeetingUseCase(meetings, calendar);

    const result = await useCase.execute({ id: "nonexistent", requesterId: OWNER });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(MeetingNotFoundError);
  });

  it("returns MeetingForbiddenError when meeting belongs to another user", async () => {
    const useCase = new CancelMeetingUseCase(meetings, calendar);
    meetings.addMeeting({ id: "m1", title: "Reunião Alheia", startAt: FUTURE, status: "scheduled", ownerId: OTHER });

    const result = await useCase.execute({ id: "m1", requesterId: OWNER });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(MeetingForbiddenError);
  });
});
