import { describe, it, expect, beforeEach, vi } from "vitest";
import { right } from "@/core/either";
import { NotifyHostBookingUseCase } from "@/domain/scheduling/application/use-cases/notify-host-booking.use-case";

const OWNER = "owner-1";
const OWNER_EMAIL = "host@wbdigitalsolutions.com";

function input(over: Partial<Parameters<NotifyHostBookingUseCase["execute"]>[0]> = {}) {
  return {
    ownerId: OWNER,
    attendeeName: "Ana Cliente",
    startAtISO: "2026-07-20T18:00:00.000Z",
    timeZone: "America/Sao_Paulo",
    meetingId: "meet-1",
    meetLink: "https://meet.google.com/abc",
    mode: "online" as const,
    ...over,
  };
}

describe("NotifyHostBookingUseCase", () => {
  let createNotification: { execute: ReturnType<typeof vi.fn> };
  let users: { findById: ReturnType<typeof vi.fn> };
  let gmail: { send: ReturnType<typeof vi.fn> };
  let uc: NotifyHostBookingUseCase;

  beforeEach(() => {
    createNotification = { execute: vi.fn().mockResolvedValue(right({})) };
    users = { findById: vi.fn().mockResolvedValue({ id: OWNER, name: "Host", email: OWNER_EMAIL, role: "admin", passwordHash: "" }) };
    gmail = { send: vi.fn().mockResolvedValue({ messageId: "m", threadId: "t" }) };
    uc = new NotifyHostBookingUseCase(createNotification as never, users as never, gmail as never);
  });

  it("cria sino p/ o dono do link E envia e-mail p/ o e-mail dele", async () => {
    const r = await uc.execute(input());
    expect(r.isRight()).toBe(true);

    const notif = createNotification.execute.mock.calls[0][0];
    expect(notif.type).toBe("BOOKING_CREATED");
    expect(notif.userId).toBe(OWNER); // sino vai pro host
    expect(notif.title).toContain("Ana Cliente");

    const mail = gmail.send.mock.calls[0][0];
    expect(mail.to).toBe(OWNER_EMAIL);
    expect(mail.subject).toContain("Ana Cliente");
    expect(mail.bodyHtml).toContain("meet.google.com/abc");
  });

  it("dono sem e-mail (ou não encontrado) → ainda cria o sino, sem e-mail", async () => {
    users.findById.mockResolvedValueOnce(null);
    const r = await uc.execute(input());
    expect(r.isRight()).toBe(true);
    expect(createNotification.execute).toHaveBeenCalledTimes(1);
    expect(gmail.send).not.toHaveBeenCalled();
  });

  it("falha no e-mail é não-fatal → sino permanece", async () => {
    gmail.send.mockRejectedValueOnce(new Error("gmail down"));
    const r = await uc.execute(input());
    expect(r.isRight()).toBe(true);
    expect(createNotification.execute).toHaveBeenCalledTimes(1);
  });

  it("falha no sino não impede o e-mail (independentes)", async () => {
    createNotification.execute.mockRejectedValueOnce(new Error("notif db down"));
    const r = await uc.execute(input());
    expect(r.isRight()).toBe(true);
    expect(gmail.send).toHaveBeenCalledTimes(1); // e-mail ainda foi enviado
  });

  it("escapa HTML do nome de quem agendou (sem injeção no e-mail)", async () => {
    await uc.execute(input({ attendeeName: "<img src=x onerror=alert(1)>" }));
    const mail = gmail.send.mock.calls[0][0];
    expect(mail.bodyHtml).not.toContain("<img src=x");
    expect(mail.bodyHtml).toContain("&lt;img src=x");
    expect(mail.subject).not.toMatch(/[\r\n]/);
  });
});
