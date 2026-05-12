import { describe, it, expect, beforeEach } from "vitest";
import { EndMeetingUseCase } from "@/domain/integrations/meet/application/use-cases/end-meeting.use-case";
import { FakeMeetingsRepository } from "../../fakes/fake-meetings.repository";
import { MeetingNotFoundError, MeetingForbiddenError } from "@/domain/integrations/meet/application/use-cases/meetings-crud.use-cases";

const OWNER = "user-001";
const OTHER = "user-002";

let repo: FakeMeetingsRepository;
let useCase: EndMeetingUseCase;

const PAST_START = new Date("2026-05-11T14:00:00.000Z"); // scheduled start
const PAST_END   = new Date("2026-05-11T15:00:00.000Z"); // scheduled end (in the past)
const FUTURE_END = new Date(Date.now() + 2 * 60 * 60 * 1000); // end still in the future

beforeEach(() => {
  repo = new FakeMeetingsRepository();
  useCase = new EndMeetingUseCase(repo);
});

describe("EndMeetingUseCase", () => {
  describe("when meeting not found", () => {
    it("returns MeetingNotFoundError", async () => {
      const result = await useCase.execute({ id: "nonexistent", requesterId: OWNER });
      expect(result.isLeft()).toBe(true);
      expect(result.value).toBeInstanceOf(MeetingNotFoundError);
    });
  });

  describe("when requester is not the owner", () => {
    it("returns MeetingForbiddenError", async () => {
      repo.addMeeting({ id: "m1", title: "R", startAt: PAST_START, endAt: PAST_END, status: "scheduled", ownerId: OWNER });
      const result = await useCase.execute({ id: "m1", requesterId: OTHER });
      expect(result.isLeft()).toBe(true);
      expect(result.value).toBeInstanceOf(MeetingForbiddenError);
    });
  });

  describe("when scheduled endAt is in the past", () => {
    it("uses scheduled startAt as actualStartAt and scheduled endAt as actualEndAt", async () => {
      repo.addMeeting({ id: "m1", title: "R", startAt: PAST_START, endAt: PAST_END, status: "scheduled", ownerId: OWNER });

      const result = await useCase.execute({ id: "m1", requesterId: OWNER });

      expect(result.isRight()).toBe(true);
      const meeting = repo.items.find((m) => m.id === "m1")!;
      expect(meeting.status).toBe("ended");
      expect(meeting.actualStartAt).toEqual(PAST_START);
      expect(meeting.actualEndAt).toEqual(PAST_END);
    });
  });

  describe("when scheduled endAt is null", () => {
    it("uses startAt as actualStartAt and now as actualEndAt", async () => {
      const before = new Date();
      repo.addMeeting({ id: "m1", title: "R", startAt: PAST_START, endAt: null, status: "scheduled", ownerId: OWNER });

      const result = await useCase.execute({ id: "m1", requesterId: OWNER });
      const after = new Date();

      expect(result.isRight()).toBe(true);
      const meeting = repo.items.find((m) => m.id === "m1")!;
      expect(meeting.actualStartAt).toEqual(PAST_START);
      expect(meeting.actualEndAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(meeting.actualEndAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe("when scheduled endAt is in the future (meeting still running)", () => {
    it("uses startAt as actualStartAt and now as actualEndAt", async () => {
      const before = new Date();
      repo.addMeeting({ id: "m1", title: "R", startAt: PAST_START, endAt: FUTURE_END, status: "scheduled", ownerId: OWNER });

      const result = await useCase.execute({ id: "m1", requesterId: OWNER });
      const after = new Date();

      expect(result.isRight()).toBe(true);
      const meeting = repo.items.find((m) => m.id === "m1")!;
      expect(meeting.actualStartAt).toEqual(PAST_START);
      expect(meeting.actualEndAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(meeting.actualEndAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
