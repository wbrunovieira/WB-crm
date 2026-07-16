import { describe, it, expect, beforeEach, vi } from "vitest";
import { right } from "@/core/either";
import { NotifyNewBotLeadUseCase } from "@/domain/lead-notifications/application/use-cases/notify-new-bot-lead.use-case";

const BOT = "bot-user-id";
const RECIPIENT_ID = "bruno-user-id";
const RECIPIENT_EMAIL = "bruno@wbdigitalsolutions.com";

function baseInput(over: Partial<Parameters<NotifyNewBotLeadUseCase["execute"]>[0]> = {}) {
  return {
    creatorId: BOT,
    leadId: "lead-1",
    businessName: "Padaria do Zé",
    botUserId: BOT,
    recipientUserId: RECIPIENT_ID,
    recipientEmail: RECIPIENT_EMAIL,
    ...over,
  };
}

describe("NotifyNewBotLeadUseCase", () => {
  let createNotification: { execute: ReturnType<typeof vi.fn> };
  let gmail: { send: ReturnType<typeof vi.fn> };
  let uc: NotifyNewBotLeadUseCase;

  beforeEach(() => {
    createNotification = { execute: vi.fn().mockResolvedValue(right({})) };
    gmail = { send: vi.fn().mockResolvedValue({ messageId: "m", threadId: "t" }) };
    uc = new NotifyNewBotLeadUseCase(createNotification as never, gmail as never);
  });

  it("lead criado pelo bot → cria notificação no sino p/ o destinatário E envia e-mail", async () => {
    const r = await uc.execute(baseInput());
    expect(r.isRight() && r.value.notified).toBe(true);

    expect(createNotification.execute).toHaveBeenCalledTimes(1);
    const notifArg = createNotification.execute.mock.calls[0][0];
    expect(notifArg.type).toBe("LEAD_CREATED");
    expect(notifArg.userId).toBe(RECIPIENT_ID); // sino vai pro humano, não pro bot
    expect(notifArg.title).toContain("Padaria do Zé");
    expect(notifArg.payload).toContain("lead-1");

    expect(gmail.send).toHaveBeenCalledTimes(1);
    const mailArg = gmail.send.mock.calls[0][0];
    expect(mailArg.to).toBe(RECIPIENT_EMAIL);
    expect(mailArg.subject).toContain("Padaria do Zé");
    expect(mailArg.bodyHtml).toContain("Padaria do Zé");
  });

  it("escapa HTML e remove quebras de linha do nome (sem injeção no e-mail)", async () => {
    await uc.execute(baseInput({ businessName: '<img src=x onerror=alert(1)>\nEvil' }));
    const mailArg = gmail.send.mock.calls[0][0];
    expect(mailArg.bodyHtml).not.toContain("<img src=x");
    expect(mailArg.bodyHtml).toContain("&lt;img src=x");
    expect(mailArg.subject).not.toMatch(/[\r\n]/);
  });

  it("lead criado por OUTRO usuário (não o bot) → não notifica nada", async () => {
    const r = await uc.execute(baseInput({ creatorId: "someone-else" }));
    expect(r.isRight() && r.value.notified).toBe(false);
    expect(createNotification.execute).not.toHaveBeenCalled();
    expect(gmail.send).not.toHaveBeenCalled();
  });

  it("falha ao enviar e-mail é não-fatal → sino ainda é criado e notified=true", async () => {
    gmail.send.mockRejectedValueOnce(new Error("gmail down"));
    const r = await uc.execute(baseInput());
    expect(r.isRight() && r.value.notified).toBe(true);
    expect(createNotification.execute).toHaveBeenCalledTimes(1);
  });

  it("sem GmailPort (opcional) → só o sino, sem quebrar", async () => {
    uc = new NotifyNewBotLeadUseCase(createNotification as never, undefined);
    const r = await uc.execute(baseInput());
    expect(r.isRight() && r.value.notified).toBe(true);
    expect(createNotification.execute).toHaveBeenCalledTimes(1);
  });
});
