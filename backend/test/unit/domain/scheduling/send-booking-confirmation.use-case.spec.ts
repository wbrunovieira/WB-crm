import { describe, it, expect, beforeEach, vi } from "vitest";
import { SendBookingConfirmationUseCase } from "@/domain/scheduling/application/use-cases/send-booking-confirmation.use-case";

function input(over: Partial<Parameters<SendBookingConfirmationUseCase["execute"]>[0]> = {}) {
  return {
    attendeeEmail: "lead@cliente.com",
    attendeeName: "John Smith",
    title: "Reunião 30min",
    startAtISO: "2026-07-20T18:00:00.000Z",
    endAtISO: "2026-07-20T18:30:00.000Z",
    attendeeTimeZone: "Europe/Rome",
    lang: "en",
    meetLink: "https://meet.google.com/abc",
    location: null,
    ...over,
  };
}

describe("SendBookingConfirmationUseCase", () => {
  let gmail: { send: ReturnType<typeof vi.fn> };
  let uc: SendBookingConfirmationUseCase;

  beforeEach(() => {
    gmail = { send: vi.fn().mockResolvedValue({ messageId: "m", threadId: "t" }) };
    uc = new SendBookingConfirmationUseCase(gmail as never);
  });

  it("envia e-mail de confirmação no idioma escolhido (en)", async () => {
    const r = await uc.execute(input({ lang: "en" }));
    expect(r.isRight() && r.value.sent).toBe(true);
    const mail = gmail.send.mock.calls[0][0];
    expect(mail.to).toBe("lead@cliente.com");
    expect(mail.subject).toContain("Meeting confirmed");   // en
    expect(mail.bodyHtml).toContain("Your meeting is confirmed");
    expect(mail.bodyHtml).toContain("Hi, John Smith!");
  });

  it("idioma pt gera assunto/corpo em português", async () => {
    await uc.execute(input({ lang: "pt", attendeeName: "Ana" }));
    const mail = gmail.send.mock.calls[0][0];
    expect(mail.subject).toContain("Reunião confirmada");
    expect(mail.bodyHtml).toContain("Sua reunião está confirmada");
    expect(mail.bodyHtml).toContain("Olá, Ana!");
  });

  it("idioma inválido cai para pt", async () => {
    await uc.execute(input({ lang: "zz" }));
    const mail = gmail.send.mock.calls[0][0];
    expect(mail.subject).toContain("Reunião confirmada");
  });

  it("escapa HTML do nome/local (sem injeção no e-mail)", async () => {
    await uc.execute(input({ attendeeName: "<img src=x onerror=alert(1)>", lang: "pt" }));
    const mail = gmail.send.mock.calls[0][0];
    expect(mail.bodyHtml).not.toContain("<img src=x");
    expect(mail.bodyHtml).toContain("&lt;img src=x");
  });

  it("fuso inválido não quebra (cai no ISO)", async () => {
    const r = await uc.execute(input({ attendeeTimeZone: "Nao/Existe" }));
    expect(r.isRight() && r.value.sent).toBe(true);
    expect(gmail.send).toHaveBeenCalledTimes(1);
  });

  it("sem GmailPort → não envia, sent=false (não quebra)", async () => {
    uc = new SendBookingConfirmationUseCase(undefined);
    const r = await uc.execute(input());
    expect(r.isRight() && r.value.sent).toBe(false);
  });

  it("falha no envio é não-fatal → sent=false", async () => {
    gmail.send.mockRejectedValueOnce(new Error("gmail down"));
    const r = await uc.execute(input());
    expect(r.isRight() && r.value.sent).toBe(false);
  });
});
