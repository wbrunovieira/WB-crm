/**
 * Google Gmail Tests
 *
 * Tests for src/lib/google/gmail.ts
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/google/auth", () => ({
  getAuthenticatedClient: vi.fn(),
}));

import { buildMimeMessage, sendEmail } from "@/lib/google/gmail";
import { getAuthenticatedClient } from "@/lib/google/auth";

const mockGetAuthenticatedClient = vi.mocked(getAuthenticatedClient);

// Fábrica de mock do Gmail client
function makeMockGmailClient(overrides: Partial<{
  send: (opts: unknown) => Promise<{ data: { id: string; threadId: string } }>;
}> = {}) {
  return {
    users: {
      messages: {
        send: vi.fn().mockResolvedValue({
          data: { id: "msg-123", threadId: "thread-456" },
        }),
        ...overrides,
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
describe("buildMimeMessage", () => {
  it("retorna string base64url com cabeçalhos corretos", () => {
    const raw = buildMimeMessage({
      to: "cliente@example.com",
      subject: "Proposta WB Digital",
      html: "<p>Olá!</p>",
      from: "contato@wbdigitalsolutions.com",
    });

    // Deve ser uma string base64url válida (sem +, /, =)
    expect(raw).toMatch(/^[A-Za-z0-9_-]+=*$/);
  });

  it("decodificado contém os cabeçalhos MIME corretos", () => {
    const raw = buildMimeMessage({
      to: "cliente@example.com",
      subject: "Proposta WB Digital",
      html: "<p>Olá!</p>",
      from: "contato@wbdigitalsolutions.com",
    });

    // Decodifica base64url → texto MIME
    const decoded = Buffer.from(raw, "base64url").toString("utf-8");

    expect(decoded).toContain("To: cliente@example.com");
    expect(decoded).toContain("Subject: Proposta WB Digital");
    expect(decoded).toContain("Content-Type: text/html");
    expect(decoded).toContain("<p>Olá!</p>");
  });

  it("inclui From quando fornecido", () => {
    const raw = buildMimeMessage({
      to: "a@b.com",
      subject: "Teste",
      html: "corpo",
      from: "remetente@wbdigitalsolutions.com",
    });

    const decoded = Buffer.from(raw, "base64url").toString("utf-8");
    expect(decoded).toContain("From: remetente@wbdigitalsolutions.com");
  });

  it("inclui In-Reply-To quando threadId fornecido", () => {
    const raw = buildMimeMessage({
      to: "a@b.com",
      subject: "Re: Proposta",
      html: "resposta",
      threadId: "thread-xyz",
    });

    const decoded = Buffer.from(raw, "base64url").toString("utf-8");
    expect(decoded).toContain("In-Reply-To: thread-xyz");
  });
});

// ---------------------------------------------------------------------------
describe("sendEmail", () => {
  it("chama a API Gmail com a mensagem MIME correta", async () => {
    const mockGmail = makeMockGmailClient();

    const result = await sendEmail(
      {
        to: "cliente@example.com",
        subject: "Olá",
        html: "<p>Mensagem</p>",
      },
      mockGmail as never
    );

    expect(mockGmail.users.messages.send).toHaveBeenCalledOnce();
    const callArg = mockGmail.users.messages.send.mock.calls[0][0] as { userId: string; requestBody: { raw: string; threadId?: string } };
    expect(callArg.userId).toBe("me");
    expect(callArg.requestBody.raw).toBeDefined();
  });

  it("retorna messageId e threadId da API", async () => {
    const mockGmail = makeMockGmailClient();

    const result = await sendEmail(
      { to: "a@b.com", subject: "Teste", html: "corpo" },
      mockGmail as never
    );

    expect(result.messageId).toBe("msg-123");
    expect(result.threadId).toBe("thread-456");
  });

  it("passa threadId no requestBody quando fornecido", async () => {
    const mockGmail = makeMockGmailClient();

    await sendEmail(
      { to: "a@b.com", subject: "Re: Teste", html: "resposta", threadId: "thread-xyz" },
      mockGmail as never
    );

    const callArg = mockGmail.users.messages.send.mock.calls[0][0] as { requestBody: { threadId?: string } };
    expect(callArg.requestBody.threadId).toBe("thread-xyz");
  });

  it("usa getAuthenticatedClient quando nenhum client é injetado", async () => {
    const mockGmail = makeMockGmailClient();
    const mockOAuth = {
      request: vi.fn(),
    };

    mockGetAuthenticatedClient.mockResolvedValue(mockOAuth as never);

    // Simulação: intercepta a criação do cliente gmail internamente
    // O teste verifica apenas que getAuthenticatedClient foi chamado
    // (a chamada real à API falhará sem client real — isso é esperado)
    try {
      await sendEmail({ to: "a@b.com", subject: "Teste", html: "corpo" });
    } catch {
      // ignora erros de API do mock — só importa que tentou autenticar
    }

    expect(mockGetAuthenticatedClient).toHaveBeenCalledOnce();
  });

  it("lança erro quando a API falha", async () => {
    const mockGmail = {
      users: {
        messages: {
          send: vi.fn().mockRejectedValue(new Error("quota exceeded")),
        },
      },
    };

    await expect(
      sendEmail({ to: "a@b.com", subject: "Teste", html: "corpo" }, mockGmail as never)
    ).rejects.toThrow("quota exceeded");
  });
});
