import { describe, it, expect, beforeEach } from "vitest";
import { CreateMeetingRemindersUseCase } from "@/domain/integrations/meet/application/use-cases/create-meeting-reminders.use-case";
import { InMemoryScheduledEmailsRepository } from "../../fakes/in-memory-scheduled-emails.repository";

const SAO_PAULO_OFFSET = -3 * 60; // UTC-3 in minutes

function spDate(hour: number, minute = 0, daysFromNow = 1): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  d.setUTCHours(hour - SAO_PAULO_OFFSET / 60, minute, 0, 0);
  return d;
}

const MEETING_BASE = {
  meetingId: "meeting-1",
  title: "Demo Reunião",
  attendeeEmails: ["lead@empresa.com", "socio@empresa.com"],
  organizerEmail: "bruno@wbdigitalsolutions.com",
  meetLink: "https://meet.google.com/abc-xyz",
};

describe("CreateMeetingRemindersUseCase", () => {
  let repo: InMemoryScheduledEmailsRepository;
  let useCase: CreateMeetingRemindersUseCase;

  beforeEach(() => {
    repo = new InMemoryScheduledEmailsRepository();
    useCase = new CreateMeetingRemindersUseCase(repo);
  });

  it("creates 3 reminder types × N attendees for a meeting tomorrow at 15h", async () => {
    const startAt = spDate(15, 0, 1); // tomorrow 15:00 SP
    const endAt = spDate(16, 0, 1);

    const result = await useCase.execute({ ...MEETING_BASE, startAt, endAt });

    expect(result.isRight()).toBe(true);
    // 2 attendees × 3 types = 6 records
    expect(repo.items).toHaveLength(6);
    const types = repo.items.map((e) => e.type);
    expect(types.filter((t) => t === "morning_reminder")).toHaveLength(2);
    expect(types.filter((t) => t === "one_hour_reminder")).toHaveLength(2);
    expect(types.filter((t) => t === "on_time_reminder")).toHaveLength(2);
  });

  it("skips morning reminder if meeting starts within 90min of 08:00 SP", async () => {
    const startAt = spDate(9, 0, 1); // tomorrow 09:00 SP — only 60min after 08:00
    const endAt = spDate(10, 0, 1);

    await useCase.execute({ ...MEETING_BASE, startAt, endAt });

    const types = repo.items.map((e) => e.type);
    expect(types.filter((t) => t === "morning_reminder")).toHaveLength(0);
    expect(types.filter((t) => t === "one_hour_reminder")).toHaveLength(2);
    expect(types.filter((t) => t === "on_time_reminder")).toHaveLength(2);
  });

  it("skips 1h reminder if meeting starts in less than 62 minutes from now", async () => {
    const startAt = new Date(Date.now() + 30 * 60 * 1000); // 30min from now
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

    await useCase.execute({ ...MEETING_BASE, startAt, endAt });

    const types = repo.items.map((e) => e.type);
    expect(types.filter((t) => t === "one_hour_reminder")).toHaveLength(0);
  });

  it("schedules morning reminder at 08:00 SP time", async () => {
    const startAt = spDate(15, 0, 1);
    const endAt = spDate(16, 0, 1);

    await useCase.execute({ ...MEETING_BASE, startAt, endAt });

    const mornings = repo.items.filter((e) => e.type === "morning_reminder");
    for (const m of mornings) {
      const spTime = m.scheduledFor.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit",
      });
      expect(spTime).toBe("08:00");
    }
  });

  it("schedules 1h reminder exactly 60min before startAt", async () => {
    const startAt = spDate(15, 0, 1);
    const endAt = spDate(16, 0, 1);

    await useCase.execute({ ...MEETING_BASE, startAt, endAt });

    const oneHour = repo.items.find((e) => e.type === "one_hour_reminder")!;
    const diff = startAt.getTime() - oneHour.scheduledFor.getTime();
    expect(diff).toBe(60 * 60 * 1000);
  });

  it("schedules on_time reminder at exactly startAt", async () => {
    const startAt = spDate(15, 0, 1);
    const endAt = spDate(16, 0, 1);

    await useCase.execute({ ...MEETING_BASE, startAt, endAt });

    const onTime = repo.items.find((e) => e.type === "on_time_reminder")!;
    expect(onTime.scheduledFor.getTime()).toBe(startAt.getTime());
  });

  it("denormalizes meeting data into each record", async () => {
    const startAt = spDate(15, 0, 1);
    const endAt = spDate(16, 0, 1);

    await useCase.execute({
      ...MEETING_BASE,
      startAt, endAt,
      contactName: "João Silva",
      companyName: "Empresa XYZ",
      description: "Apresentação da plataforma",
    });

    const record = repo.items[0];
    expect(record.meetingTitle).toBe("Demo Reunião");
    expect(record.meetLink).toBe(MEETING_BASE.meetLink);
    expect(record.contactName).toBe("João Silva");
    expect(record.companyName).toBe("Empresa XYZ");
    expect(record.organizerEmail).toBe(MEETING_BASE.organizerEmail);
  });

  it("returns left if no attendee emails provided", async () => {
    const startAt = spDate(15, 0, 1);
    const result = await useCase.execute({ ...MEETING_BASE, attendeeEmails: [], startAt });
    expect(result.isLeft()).toBe(true);
  });
});
