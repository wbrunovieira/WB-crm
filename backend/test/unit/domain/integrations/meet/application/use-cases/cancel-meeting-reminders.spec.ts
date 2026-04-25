import { describe, it, expect, beforeEach } from "vitest";
import { CancelMeetingRemindersUseCase } from "@/domain/integrations/meet/application/use-cases/cancel-meeting-reminders.use-case";
import { InMemoryScheduledEmailsRepository } from "../../fakes/in-memory-scheduled-emails.repository";

describe("CancelMeetingRemindersUseCase", () => {
  let repo: InMemoryScheduledEmailsRepository;
  let useCase: CancelMeetingRemindersUseCase;

  beforeEach(() => {
    repo = new InMemoryScheduledEmailsRepository();
    useCase = new CancelMeetingRemindersUseCase(repo);
  });

  it("cancels all pending reminders for a meeting", async () => {
    await repo.createMany([
      { meetingId: "m1", type: "morning_reminder", scheduledFor: new Date(), recipientEmail: "a@b.com", meetingTitle: "Test", meetingStartAt: new Date() },
      { meetingId: "m1", type: "one_hour_reminder", scheduledFor: new Date(), recipientEmail: "a@b.com", meetingTitle: "Test", meetingStartAt: new Date() },
      { meetingId: "m1", type: "on_time_reminder", scheduledFor: new Date(), recipientEmail: "a@b.com", meetingTitle: "Test", meetingStartAt: new Date() },
    ]);

    const result = await useCase.execute("m1");

    expect(result.isRight()).toBe(true);
    expect(repo.items.every((e) => e.status === "cancelled")).toBe(true);
  });

  it("does not affect reminders from other meetings", async () => {
    await repo.createMany([
      { meetingId: "m1", type: "on_time_reminder", scheduledFor: new Date(), recipientEmail: "a@b.com", meetingTitle: "Test", meetingStartAt: new Date() },
      { meetingId: "m2", type: "on_time_reminder", scheduledFor: new Date(), recipientEmail: "b@b.com", meetingTitle: "Other", meetingStartAt: new Date() },
    ]);

    await useCase.execute("m1");

    const m2 = repo.items.find((e) => e.meetingId === "m2")!;
    expect(m2.status).toBe("pending");
  });

  it("does not cancel already sent reminders", async () => {
    await repo.createMany([
      { meetingId: "m1", type: "morning_reminder", scheduledFor: new Date(), recipientEmail: "a@b.com", meetingTitle: "Test", meetingStartAt: new Date() },
    ]);
    await repo.markSent(repo.items[0].id);
    await useCase.execute("m1");

    expect(repo.items[0].status).toBe("sent");
  });
});
