import { describe, it, expect, beforeEach, vi } from "vitest";
import { SendScheduledEmailsUseCase } from "@/domain/integrations/meet/application/use-cases/send-scheduled-emails.use-case";
import { InMemoryScheduledEmailsRepository } from "../../fakes/in-memory-scheduled-emails.repository";
import { GmailPort } from "@/domain/integrations/email/application/ports/gmail.port";
import { EvolutionApiPort } from "@/domain/integrations/whatsapp/application/ports/evolution-api.port";

function makeFakeWhatsApp(sendText = vi.fn().mockResolvedValue(undefined)) {
  return { sendText } as unknown as EvolutionApiPort & { sendText: ReturnType<typeof vi.fn> };
}

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

  describe("WhatsApp reminder copy", () => {
    it("sends a friendly morning reminder greeting the contact by first name, with no robotic label", async () => {
      const whatsApp = makeFakeWhatsApp();
      useCase = new SendScheduledEmailsUseCase(repo, gmail, whatsApp);

      await repo.createMany([{
        meetingId: "m1",
        type: "morning_reminder",
        scheduledFor: new Date(Date.now() - 1000),
        recipientEmail: "",
        meetingTitle: "Apresentação WB Digital Solutions - Website | Tem Tudo",
        meetingStartAt: futureDate(3 * 60 * 60_000),
        contactName: "João Silva",
        channel: "whatsapp",
        recipientPhone: "5511999999999",
      }]);

      await useCase.execute();

      expect(whatsApp.sendText).toHaveBeenCalledOnce();
      const [phone, text] = whatsApp.sendText.mock.calls[0];
      expect(phone).toBe("5511999999999");
      expect(text).toContain("Bom dia, João!");
      expect(text).toContain("Passando só para confirmar que hoje teremos a nossa reunião.");
      expect(text).toContain("Apresentação WB Digital Solutions - Website | Tem Tudo");
      expect(text).toContain("Abraços!");
      // Old robotic labels must be gone
      expect(text).not.toContain("Lembrete do dia");
      expect(text).not.toContain("🔔");
      expect(repo.items[0].status).toBe("sent");
    });

    it("falls back to a generic good morning when no contact name is set", async () => {
      const whatsApp = makeFakeWhatsApp();
      useCase = new SendScheduledEmailsUseCase(repo, gmail, whatsApp);

      await repo.createMany([{
        meetingId: "m1",
        type: "morning_reminder",
        scheduledFor: new Date(Date.now() - 1000),
        recipientEmail: "",
        meetingTitle: "Reunião Tem Tudo",
        meetingStartAt: futureDate(3 * 60 * 60_000),
        channel: "whatsapp",
        recipientPhone: "5511888888888",
      }]);

      await useCase.execute();

      const [, text] = whatsApp.sendText.mock.calls[0];
      expect(text).toContain("Bom dia! 👋");
      expect(text).not.toContain("Bom dia,");
    });
  });
});
