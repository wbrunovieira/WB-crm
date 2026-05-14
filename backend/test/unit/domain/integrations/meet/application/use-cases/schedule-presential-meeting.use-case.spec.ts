import { describe, it, expect, beforeEach, vi } from "vitest";
import { SchedulePresentialMeetingUseCase } from "@/domain/integrations/meet/application/use-cases/schedule-presential-meeting.use-case";
import { FakeMeetingsRepository } from "../../fakes/fake-meetings.repository";

// Minimal fake for WhatsApp confirmation
const makeWhatsAppPort = (overrides: { sendText?: (to: string, text: string) => Promise<{ messageId: string }> } = {}) => ({
  sendText: overrides.sendText ?? vi.fn().mockResolvedValue({ messageId: "msg-1" }),
  sendAudio: vi.fn(),
  downloadMedia: vi.fn(),
});

// Minimal fake for Gmail confirmation
const makeGmailPort = (overrides: { sendCalendarInvite?: (...args: any[]) => Promise<void> } = {}) => ({
  send: vi.fn().mockResolvedValue(undefined),
  sendCalendarInvite: overrides.sendCalendarInvite ?? vi.fn().mockResolvedValue(undefined),
  getProfile: vi.fn().mockResolvedValue({ emailAddress: "owner@example.com" }),
  sendWithAttachment: vi.fn(),
  pollHistory: vi.fn(),
  getThread: vi.fn(),
  getMessage: vi.fn(),
  markAsRead: vi.fn(),
});

describe("SchedulePresentialMeetingUseCase", () => {
  let repo: FakeMeetingsRepository;
  let sut: SchedulePresentialMeetingUseCase;

  beforeEach(() => {
    repo = new FakeMeetingsRepository();
    sut = new SchedulePresentialMeetingUseCase(repo, null, null, null, null);
  });

  it("cria reunião presencial sem Google Calendar", async () => {
    const result = await sut.execute({
      title: "Reunião Presencial",
      startAt: new Date("2026-05-10T14:00:00Z"),
      attendeeEmails: ["cliente@empresa.com"],
      requesterId: "owner-1",
      isPresential: true,
    });

    expect(result.isRight()).toBe(true);
    const meeting = result.unwrap();
    expect(meeting.isPresential).toBe(true);
    expect(meeting.googleEventId).toBeNull();
    expect(meeting.meetLink).toBeNull();
  });

  it("salva localização fisica na reunião", async () => {
    const result = await sut.execute({
      title: "Visita Comercial",
      startAt: new Date("2026-05-10T14:00:00Z"),
      attendeeEmails: [],
      requesterId: "owner-1",
      isPresential: true,
      location: "Rua das Flores, 100 — Sala 202",
    });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().location).toBe("Rua das Flores, 100 — Sala 202");
  });

  it("salva confirmationMethod na reunião", async () => {
    const result = await sut.execute({
      title: "Reunião Presencial",
      startAt: new Date("2026-05-10T14:00:00Z"),
      attendeeEmails: ["cliente@empresa.com"],
      requesterId: "owner-1",
      isPresential: true,
      confirmationMethod: "whatsapp",
    });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().confirmationMethod).toBe("whatsapp");
  });

  it("cria sem confirmação quando confirmationMethod é none ou omitido", async () => {
    const result = await sut.execute({
      title: "Reunião Presencial",
      startAt: new Date("2026-05-10T14:00:00Z"),
      attendeeEmails: [],
      requesterId: "owner-1",
      isPresential: true,
    });

    expect(result.isRight()).toBe(true);
    expect(repo.items[0].confirmationSentAt).toBeNull();
  });

  it("vincula ao lead quando leadId fornecido", async () => {
    const result = await sut.execute({
      title: "Visita ao Lead",
      startAt: new Date("2026-05-10T14:00:00Z"),
      attendeeEmails: [],
      requesterId: "owner-1",
      isPresential: true,
      leadId: "lead-abc",
    });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().leadId).toBe("lead-abc");
  });

  it("retorna erro quando title é vazio", async () => {
    const result = await sut.execute({
      title: "  ",
      startAt: new Date("2026-05-10T14:00:00Z"),
      attendeeEmails: [],
      requesterId: "owner-1",
      isPresential: true,
    });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(Error);
  });

  describe("confirmação por WhatsApp", () => {
    it("envia mensagem de confirmação quando confirmationMethod=whatsapp e número fornecido", async () => {
      const sendText = vi.fn().mockResolvedValue({ messageId: "msg-1" });
      const whatsApp = makeWhatsAppPort({ sendText });
      const sut2 = new SchedulePresentialMeetingUseCase(repo, whatsApp as any, null, null, null);

      const result = await sut2.execute({
        title: "Reunião Comercial",
        startAt: new Date("2026-05-10T14:00:00Z"),
        attendeeEmails: [],
        requesterId: "owner-1",
        isPresential: true,
        confirmationMethod: "whatsapp",
        confirmationPhone: "+5524999990000",
        leadId: "lead-1",
      });

      expect(result.isRight()).toBe(true);
      expect(sendText).toHaveBeenCalledOnce();
      const [to, text] = sendText.mock.calls[0];
      expect(to).toBe("+5524999990000");
      expect(text).toContain("Reunião Comercial");
      expect(repo.items[0].confirmationSentAt).not.toBeNull();
    });

    it("não envia WhatsApp quando confirmationPhone não fornecido", async () => {
      const sendText = vi.fn().mockResolvedValue({ messageId: "msg-1" });
      const whatsApp = makeWhatsAppPort({ sendText });
      const sut2 = new SchedulePresentialMeetingUseCase(repo, whatsApp as any, null, null, null);

      await sut2.execute({
        title: "Reunião",
        startAt: new Date("2026-05-10T14:00:00Z"),
        attendeeEmails: [],
        requesterId: "owner-1",
        isPresential: true,
        confirmationMethod: "whatsapp",
        // confirmationPhone omitted
      });

      expect(sendText).not.toHaveBeenCalled();
    });

    it("não falha a criação se o envio WhatsApp falhar", async () => {
      const whatsApp = makeWhatsAppPort({
        sendText: vi.fn().mockRejectedValue(new Error("WA offline")),
      });
      const sut2 = new SchedulePresentialMeetingUseCase(repo, whatsApp as any, null, null, null);

      const result = await sut2.execute({
        title: "Reunião",
        startAt: new Date(),
        attendeeEmails: [],
        requesterId: "owner-1",
        isPresential: true,
        confirmationMethod: "whatsapp",
        confirmationPhone: "+5524999990000",
      });

      expect(result.isRight()).toBe(true);
    });
  });

  describe("confirmação por email", () => {
    it("envia email de confirmação quando confirmationMethod=email", async () => {
      const sendCalendarInvite = vi.fn().mockResolvedValue(undefined);
      const gmail = makeGmailPort({ sendCalendarInvite });
      const sut2 = new SchedulePresentialMeetingUseCase(repo, null, gmail as any, null, null);

      const result = await sut2.execute({
        title: "Reunião Presencial",
        startAt: new Date("2026-05-10T14:00:00Z"),
        attendeeEmails: ["cliente@empresa.com"],
        requesterId: "owner-1",
        isPresential: true,
        confirmationMethod: "email",
      });

      expect(result.isRight()).toBe(true);
      expect(sendCalendarInvite).toHaveBeenCalledOnce();
      const callArgs = sendCalendarInvite.mock.calls[0][0];
      expect(callArgs.to).toBe("cliente@empresa.com");
      expect(callArgs.subject).toContain("Reunião Presencial");
      expect(repo.items[0].confirmationSentAt).not.toBeNull();
    });

    it("envia email para cada attendee", async () => {
      const sendCalendarInvite = vi.fn().mockResolvedValue(undefined);
      const gmail = makeGmailPort({ sendCalendarInvite });
      const sut2 = new SchedulePresentialMeetingUseCase(repo, null, gmail as any, null, null);

      await sut2.execute({
        title: "Reunião",
        startAt: new Date(),
        attendeeEmails: ["a@a.com", "b@b.com"],
        requesterId: "owner-1",
        isPresential: true,
        confirmationMethod: "email",
      });

      expect(sendCalendarInvite).toHaveBeenCalledTimes(2);
    });

    it("não falha a criação se envio de email falhar", async () => {
      const gmail = makeGmailPort({
        sendCalendarInvite: vi.fn().mockRejectedValue(new Error("SMTP error")),
      });
      const sut2 = new SchedulePresentialMeetingUseCase(repo, null, gmail as any, null, null);

      const result = await sut2.execute({
        title: "Reunião",
        startAt: new Date(),
        attendeeEmails: ["a@a.com"],
        requesterId: "owner-1",
        isPresential: true,
        confirmationMethod: "email",
      });

      expect(result.isRight()).toBe(true);
    });

    it("não envia email quando attendeeEmails vazio", async () => {
      const sendCalendarInvite = vi.fn().mockResolvedValue(undefined);
      const gmail = makeGmailPort({ sendCalendarInvite });
      const sut2 = new SchedulePresentialMeetingUseCase(repo, null, gmail as any, null, null);

      await sut2.execute({
        title: "Reunião",
        startAt: new Date(),
        attendeeEmails: [],
        requesterId: "owner-1",
        isPresential: true,
        confirmationMethod: "email",
      });

      expect(sendCalendarInvite).not.toHaveBeenCalled();
    });
  });
});
