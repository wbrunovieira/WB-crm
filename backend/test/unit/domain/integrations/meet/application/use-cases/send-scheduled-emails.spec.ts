import { describe, it, expect, beforeEach, vi } from "vitest";
import { SendScheduledEmailsUseCase } from "@/domain/integrations/meet/application/use-cases/send-scheduled-emails.use-case";
import { InMemoryScheduledEmailsRepository } from "../../fakes/in-memory-scheduled-emails.repository";
import { GmailPort } from "@/domain/integrations/email/application/ports/gmail.port";

function makeFakeGmail(sendFn?: () => Promise<void>) {
  return {
    send: sendFn ?? vi.fn().mockResolvedValue(undefined),
    pollHistory: vi.fn(),
    getProfile: vi.fn(),
    getMessage: vi.fn(),
    getSendAsAliases: vi.fn(),
    sendCalendarInvite: vi.fn(),
  } as unknown as GmailPort;
}

function futureDate(offsetMs: number): Date {
  return new Date(Date.now() + offsetMs);
}

describe("SendScheduledEmailsUseCase", () => {
  let repo: InMemoryScheduledEmailsRepository;
  let gmail: GmailPort;
  let useCase: SendScheduledEmailsUseCase;

  beforeEach(() => {
    repo = new InMemoryScheduledEmailsRepository();
    gmail = makeFakeGmail();
    useCase = new SendScheduledEmailsUseCase(repo, gmail);
  });

  it("sends due emails and marks them as sent", async () => {
    await repo.createMany([{
      meetingId: "m1",
      type: "one_hour_reminder",
      scheduledFor: new Date(Date.now() - 1000), // due
      recipientEmail: "lead@empresa.com",
      organizerEmail: "bruno@wbdigitalsolutions.com",
      meetingTitle: "Demo WB",
      meetingStartAt: futureDate(30 * 60_000),
      meetLink: "https://meet.google.com/abc",
    }]);

    const result = await useCase.execute();

    expect(result.isRight()).toBe(true);
    expect((gmail.send as ReturnType<typeof vi.fn>)).toHaveBeenCalledOnce();
    expect(repo.items[0].status).toBe("sent");
  });

  it("does not send emails scheduled for the future", async () => {
    await repo.createMany([{
      meetingId: "m1",
      type: "morning_reminder",
      scheduledFor: new Date(Date.now() + 60 * 60_000), // 1h in future
      recipientEmail: "lead@empresa.com",
      organizerEmail: "bruno@wbdigitalsolutions.com",
      meetingTitle: "Demo WB",
      meetingStartAt: futureDate(3 * 60 * 60_000),
    }]);

    await useCase.execute();

    expect((gmail.send as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    expect(repo.items[0].status).toBe("pending");
  });

  it("marks email as failed and records reason if send throws", async () => {
    const failGmail = makeFakeGmail(() => Promise.reject(new Error("SMTP timeout")));
    useCase = new SendScheduledEmailsUseCase(repo, failGmail);

    await repo.createMany([{
      meetingId: "m1",
      type: "on_time_reminder",
      scheduledFor: new Date(Date.now() - 1000),
      recipientEmail: "lead@empresa.com",
      organizerEmail: "bruno@wbdigitalsolutions.com",
      meetingTitle: "Demo",
      meetingStartAt: new Date(),
    }]);

    await useCase.execute();

    expect(repo.items[0].status).toBe("failed");
    expect(repo.items[0].failReason).toBe("SMTP timeout");
  });

  it("processes multiple due emails in one run", async () => {
    await repo.createMany([
      { meetingId: "m1", type: "morning_reminder", scheduledFor: new Date(Date.now() - 1000), recipientEmail: "a@b.com", organizerEmail: "bruno@wbdigitalsolutions.com", meetingTitle: "A", meetingStartAt: new Date() },
      { meetingId: "m1", type: "one_hour_reminder", scheduledFor: new Date(Date.now() - 1000), recipientEmail: "b@b.com", organizerEmail: "bruno@saltoup.com", meetingTitle: "A", meetingStartAt: new Date() },
    ]);

    await useCase.execute();

    expect((gmail.send as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(2);
    expect(repo.items.every((e) => e.status === "sent")).toBe(true);
  });

  it("returns sent count in result", async () => {
    await repo.createMany([
      { meetingId: "m1", type: "on_time_reminder", scheduledFor: new Date(Date.now() - 1000), recipientEmail: "a@b.com", organizerEmail: "bruno@wbdigitalsolutions.com", meetingTitle: "A", meetingStartAt: new Date() },
    ]);

    const result = await useCase.execute();
    expect(result.isRight()).toBe(true);
    expect(result.unwrap().sent).toBe(1);
  });
});
