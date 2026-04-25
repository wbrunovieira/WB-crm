import { describe, it, expect, beforeEach } from "vitest";
import { PurgeCompletedMeetingUseCase } from "@/domain/integrations/meet/application/use-cases/purge-completed-meeting.use-case";
import { MeetingNotFoundError, MeetingForbiddenError } from "@/domain/integrations/meet/application/use-cases/meetings-crud.use-cases";
import { FakeMeetingsRepository } from "../../fakes/fake-meetings.repository";
import { FakeGoogleDrivePort } from "../../fakes/fake-google-drive.port";
import { FakeGoogleCalendarPort } from "../../fakes/fake-google-calendar.port";

const ADMIN = "admin-001";
const OWNER = "user-001";
const PAST = new Date(Date.now() - 60 * 60 * 1000);
const FUTURE = new Date(Date.now() + 60 * 60 * 1000);

describe("PurgeCompletedMeetingUseCase", () => {
  let meetings: FakeMeetingsRepository;
  let drive: FakeGoogleDrivePort;
  let calendar: FakeGoogleCalendarPort;
  let useCase: PurgeCompletedMeetingUseCase;

  beforeEach(() => {
    meetings = new FakeMeetingsRepository();
    drive = new FakeGoogleDrivePort();
    calendar = new FakeGoogleCalendarPort();
    useCase = new PurgeCompletedMeetingUseCase(meetings, drive, calendar);
  });

  // ── Authorization ──────────────────────────────────────────────────────────

  it("returns MeetingNotFoundError when meeting does not exist", async () => {
    const result = await useCase.execute({ id: "nonexistent", requesterId: ADMIN, isAdmin: true });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(MeetingNotFoundError);
  });

  it("returns MeetingForbiddenError when requester is not admin", async () => {
    meetings.addMeeting({ id: "m1", title: "Demo", startAt: PAST, status: "ended", ownerId: OWNER });

    const result = await useCase.execute({ id: "m1", requesterId: OWNER, isAdmin: false });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(MeetingForbiddenError);
  });

  // ── Completed (ended) meetings ─────────────────────────────────────────────

  it("deletes a completed meeting from the database", async () => {
    meetings.addMeeting({ id: "m1", title: "Demo", startAt: PAST, status: "ended", ownerId: OWNER });

    const result = await useCase.execute({ id: "m1", requesterId: ADMIN, isAdmin: true });

    expect(result.isRight()).toBe(true);
    expect(meetings.items).toHaveLength(0);
  });

  it("deletes the linked activity when activityId is set", async () => {
    meetings.addMeeting({ id: "m1", title: "Demo", startAt: PAST, status: "ended", ownerId: OWNER, activityId: "act-001" });

    await useCase.execute({ id: "m1", requesterId: ADMIN, isAdmin: true });

    expect(meetings.deletedActivityIds).toContain("act-001");
  });

  it("does not call deleteActivity when no activityId", async () => {
    meetings.addMeeting({ id: "m1", title: "Demo", startAt: PAST, status: "ended", ownerId: OWNER });

    await useCase.execute({ id: "m1", requesterId: ADMIN, isAdmin: true });

    expect(meetings.deletedActivityIds).toHaveLength(0);
  });

  it("deletes the Drive recording when recordingDriveId is set", async () => {
    meetings.addMeeting({ id: "m1", title: "Demo", startAt: PAST, status: "ended", ownerId: OWNER, recordingDriveId: "drive-file-001" });

    await useCase.execute({ id: "m1", requesterId: ADMIN, isAdmin: true });

    expect(drive.deletedFileIds).toContain("drive-file-001");
  });

  it("proceeds with DB delete even if Drive deletion fails (non-fatal)", async () => {
    meetings.addMeeting({ id: "m1", title: "Demo", startAt: PAST, status: "ended", ownerId: OWNER, recordingDriveId: "drive-file-001" });
    drive.shouldFailDelete = true;

    const result = await useCase.execute({ id: "m1", requesterId: ADMIN, isAdmin: true });

    expect(result.isRight()).toBe(true);
    expect(meetings.items).toHaveLength(0);
  });

  it("deletes activity, recording and meeting in one operation", async () => {
    meetings.addMeeting({
      id: "m1", title: "Full Demo", startAt: PAST, status: "ended", ownerId: OWNER,
      activityId: "act-001", recordingDriveId: "drive-file-001",
      transcriptText: "transcript content", meetingSummary: "ai summary",
    });

    const result = await useCase.execute({ id: "m1", requesterId: ADMIN, isAdmin: true });

    expect(result.isRight()).toBe(true);
    expect(meetings.items).toHaveLength(0);
    expect(meetings.deletedActivityIds).toContain("act-001");
    expect(drive.deletedFileIds).toContain("drive-file-001");
  });

  // ── Scheduled meetings ─────────────────────────────────────────────────────

  it("deletes a scheduled meeting and cancels the Google Calendar event", async () => {
    meetings.addMeeting({ id: "m1", title: "Demo", startAt: FUTURE, status: "scheduled", ownerId: OWNER, googleEventId: "gcal-001" });
    calendar.addEvent({ googleEventId: "gcal-001", attendees: [] });

    const result = await useCase.execute({ id: "m1", requesterId: ADMIN, isAdmin: true });

    expect(result.isRight()).toBe(true);
    expect(meetings.items).toHaveLength(0);
    expect(calendar.cancelledEventIds).toContain("gcal-001");
  });

  it("deletes a scheduled meeting even when no Google Calendar event", async () => {
    meetings.addMeeting({ id: "m1", title: "Demo", startAt: FUTURE, status: "scheduled", ownerId: OWNER });

    const result = await useCase.execute({ id: "m1", requesterId: ADMIN, isAdmin: true });

    expect(result.isRight()).toBe(true);
    expect(meetings.items).toHaveLength(0);
  });

  it("proceeds with DB delete even if calendar cancellation fails (non-fatal)", async () => {
    meetings.addMeeting({ id: "m1", title: "Demo", startAt: FUTURE, status: "scheduled", ownerId: OWNER, googleEventId: "gcal-001" });
    calendar.cancelEvent = async () => { throw new Error("Calendar down"); };

    const result = await useCase.execute({ id: "m1", requesterId: ADMIN, isAdmin: true });

    expect(result.isRight()).toBe(true);
    expect(meetings.items).toHaveLength(0);
  });

  // ── Cancelled meetings ─────────────────────────────────────────────────────

  it("deletes a cancelled meeting without touching the calendar", async () => {
    meetings.addMeeting({ id: "m1", title: "Demo", startAt: PAST, status: "cancelled", ownerId: OWNER });

    const result = await useCase.execute({ id: "m1", requesterId: ADMIN, isAdmin: true });

    expect(result.isRight()).toBe(true);
    expect(meetings.items).toHaveLength(0);
    expect(calendar.cancelledEventIds).toHaveLength(0);
  });

  it("deletes the linked activity for a cancelled meeting", async () => {
    meetings.addMeeting({ id: "m1", title: "Demo", startAt: PAST, status: "cancelled", ownerId: OWNER, activityId: "act-002" });

    await useCase.execute({ id: "m1", requesterId: ADMIN, isAdmin: true });

    expect(meetings.deletedActivityIds).toContain("act-002");
  });
});
