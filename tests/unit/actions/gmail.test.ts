/**
 * Gmail Send Action Tests
 *
 * Tests for src/actions/gmail.ts
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/google/gmail", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    activity: { create: vi.fn(), updateMany: vi.fn() },
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { child: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) },
}));

import { sendGmailMessage } from "@/actions/gmail";
import { sendEmail } from "@/lib/google/gmail";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

const mockSendEmail = vi.mocked(sendEmail);
const mockActivityCreate = vi.mocked(prisma.activity.create);
const mockActivityUpdateMany = vi.mocked(prisma.activity.updateMany);
const mockGetSession = vi.mocked(getServerSession);

const SESSION = {
  user: { id: "user-123", name: "Bruno", email: "bruno@wb.com", role: "admin" },
};

const SEND_RESULT = { messageId: "gmail-msg-123", threadId: "thread-abc" };

const VALID_INPUT = {
  to: "cliente@example.com",
  subject: "Proposta WB Digital",
  html: "<p>Olá! Segue a proposta.</p>",
  contactId: "contact-1",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(SESSION as never);
  mockSendEmail.mockResolvedValue(SEND_RESULT);
  mockActivityCreate.mockResolvedValue({ id: "activity-1" } as never);
  mockActivityUpdateMany.mockResolvedValue({ count: 0 } as never);
});

// ---------------------------------------------------------------------------
describe("sendGmailMessage — autenticação", () => {
  it("retorna erro se não autenticado", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await sendGmailMessage(VALID_INPUT);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/não autorizado/i);
  });

  it("prossegue quando autenticado", async () => {
    const result = await sendGmailMessage(VALID_INPUT);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe("sendGmailMessage — validação", () => {
  it("retorna erro quando 'to' está vazio", async () => {
    const result = await sendGmailMessage({ ...VALID_INPUT, to: "" });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("retorna erro quando 'subject' está vazio", async () => {
    const result = await sendGmailMessage({ ...VALID_INPUT, subject: "" });
    expect(result.success).toBe(false);
  });

  it("retorna erro quando 'html' está vazio", async () => {
    const result = await sendGmailMessage({ ...VALID_INPUT, html: "" });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe("sendGmailMessage — envio", () => {
  it("chama sendEmail com os parâmetros corretos", async () => {
    await sendGmailMessage(VALID_INPUT);

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "cliente@example.com",
        subject: "Proposta WB Digital",
        // HTML agora contém pixel de tracking injetado
        html: expect.stringContaining("<p>Olá! Segue a proposta.</p>"),
      })
    );
  });

  it("retorna success com messageId", async () => {
    const result = await sendGmailMessage(VALID_INPUT);

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("gmail-msg-123");
  });

  it("retorna erro quando sendEmail falha", async () => {
    mockSendEmail.mockRejectedValue(new Error("quota exceeded"));

    const result = await sendGmailMessage(VALID_INPUT);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/quota exceeded/i);
  });
});

// ---------------------------------------------------------------------------
describe("sendGmailMessage — Activity criada", () => {
  it("cria Activity do tipo email após envio bem-sucedido", async () => {
    await sendGmailMessage(VALID_INPUT);

    expect(mockActivityCreate).toHaveBeenCalledOnce();
    const call = mockActivityCreate.mock.calls[0][0];
    expect(call.data.type).toBe("email");
  });

  it("Activity contém emailMessageId para idempotência", async () => {
    await sendGmailMessage(VALID_INPUT);

    const call = mockActivityCreate.mock.calls[0][0];
    expect(call.data.emailMessageId).toBe("gmail-msg-123");
  });

  it("Activity contém emailSubject com o assunto", async () => {
    await sendGmailMessage(VALID_INPUT);

    const call = mockActivityCreate.mock.calls[0][0];
    expect(call.data.emailSubject).toBe("Proposta WB Digital");
  });

  it("Activity vinculada ao contactId quando fornecido", async () => {
    await sendGmailMessage(VALID_INPUT);

    const call = mockActivityCreate.mock.calls[0][0];
    expect(call.data.contactId).toBe("contact-1");
  });

  it("Activity vinculada ao leadId quando fornecido", async () => {
    await sendGmailMessage({ ...VALID_INPUT, contactId: undefined, leadId: "lead-1" });

    const call = mockActivityCreate.mock.calls[0][0];
    expect(call.data.leadId).toBe("lead-1");
  });

  it("não cria Activity se sendEmail falhar", async () => {
    mockSendEmail.mockRejectedValue(new Error("network error"));

    await sendGmailMessage(VALID_INPUT);

    expect(mockActivityCreate).not.toHaveBeenCalled();
  });

  it("Activity contém emailThreadId do resultado do envio", async () => {
    await sendGmailMessage(VALID_INPUT);

    const call = mockActivityCreate.mock.calls[0][0];
    expect(call.data.emailThreadId).toBe("thread-abc");
  });
});

// ---------------------------------------------------------------------------
describe("sendGmailMessage — reply com threadId (Phase 2a/2b)", () => {
  it("passa threadId para sendEmail quando fornecido", async () => {
    await sendGmailMessage({ ...VALID_INPUT, threadId: "thread-abc" });

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ threadId: "thread-abc" })
    );
  });

  it("resultado contém threadId da thread Gmail", async () => {
    const result = await sendGmailMessage(VALID_INPUT);

    expect(result.threadId).toBe("thread-abc");
  });

  it("marca e-mails recebidos da mesma thread como respondidos ao enviar reply", async () => {
    await sendGmailMessage({ ...VALID_INPUT, threadId: "thread-abc" });

    expect(mockActivityUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          emailThreadId: "thread-abc",
          emailReplied: false,
          emailFromAddress: expect.objectContaining({ not: null }),
        }),
        data: { emailReplied: true },
      })
    );
  });

  it("não chama updateMany quando não há threadId (e-mail novo, não reply)", async () => {
    await sendGmailMessage(VALID_INPUT); // sem threadId

    expect(mockActivityUpdateMany).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
describe("sendGmailMessage — tracking de abertura e clique", () => {
  it("Activity criada contém emailTrackingToken único", async () => {
    await sendGmailMessage(VALID_INPUT);

    const call = mockActivityCreate.mock.calls[0][0];
    expect(call.data.emailTrackingToken).toBeDefined();
    expect(typeof call.data.emailTrackingToken).toBe("string");
    expect(call.data.emailTrackingToken.length).toBeGreaterThan(0);
  });

  it("HTML enviado contém pixel de tracking com o token", async () => {
    await sendGmailMessage(VALID_INPUT);

    const activityCall = mockActivityCreate.mock.calls[0][0];
    const token = activityCall.data.emailTrackingToken as string;

    const sendEmailCall = mockSendEmail.mock.calls[0][0];
    expect(sendEmailCall.html).toContain(`/api/track/open/${token}`);
  });

  it("HTML enviado envolve links existentes com URL de tracking", async () => {
    await sendGmailMessage({
      ...VALID_INPUT,
      html: '<p>Acesse <a href="https://example.com/proposta">aqui</a></p>',
    });

    const sendEmailCall = mockSendEmail.mock.calls[0][0];
    expect(sendEmailCall.html).toContain("/api/track/click/");
    expect(sendEmailCall.html).toContain("https%3A%2F%2Fexample.com%2Fproposta");
  });

  it("dois envios geram tokens diferentes", async () => {
    await sendGmailMessage(VALID_INPUT);
    await sendGmailMessage(VALID_INPUT);

    const token1 = mockActivityCreate.mock.calls[0][0].data.emailTrackingToken;
    const token2 = mockActivityCreate.mock.calls[1][0].data.emailTrackingToken;
    expect(token1).not.toBe(token2);
  });
});
