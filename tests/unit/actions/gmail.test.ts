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
    activity: { create: vi.fn() },
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
});

// ---------------------------------------------------------------------------
describe("sendGmailMessage — autenticação", () => {
  it("lança erro se não autenticado", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(sendGmailMessage(VALID_INPUT)).rejects.toThrow(/não autorizado/i);
  });

  it("prossegue quando autenticado", async () => {
    const result = await sendGmailMessage(VALID_INPUT);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe("sendGmailMessage — validação", () => {
  it("lança erro quando 'to' está vazio", async () => {
    await expect(sendGmailMessage({ ...VALID_INPUT, to: "" })).rejects.toThrow();
  });

  it("lança erro quando 'subject' está vazio", async () => {
    await expect(sendGmailMessage({ ...VALID_INPUT, subject: "" })).rejects.toThrow();
  });

  it("lança erro quando 'html' está vazio", async () => {
    await expect(sendGmailMessage({ ...VALID_INPUT, html: "" })).rejects.toThrow();
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
        html: "<p>Olá! Segue a proposta.</p>",
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
});
