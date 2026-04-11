/**
 * Gmail Poller Tests
 *
 * Tests for src/lib/google/gmail-poller.ts
 * - Busca mensagens novas desde um historyId
 * - Filtra apenas mensagens da INBOX (ignora enviados, spam, etc.)
 * - Extrai remetente, assunto e corpo corretamente
 * - Retorna historyId atualizado para o próximo poll
 * - Não falha quando não há mensagens novas
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/google/auth", () => ({
  getAuthenticatedClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() }) },
}));

import { pollNewEmails, parseEmailHeaders } from "@/lib/google/gmail-poller";
import { getAuthenticatedClient } from "@/lib/google/auth";

const mockGetAuthenticatedClient = vi.mocked(getAuthenticatedClient);

// Fábrica de mock Gmail client para polling
function makeMockGmailPoller(overrides: {
  historyList?: unknown;
  messageGet?: unknown;
} = {}) {
  return {
    users: {
      history: {
        list: vi.fn().mockResolvedValue({
          data: overrides.historyList ?? {
            history: [],
            historyId: "12345",
          },
        }),
      },
      messages: {
        get: vi.fn().mockResolvedValue({
          data: overrides.messageGet ?? {},
        }),
      },
    },
  };
}

const RAW_MESSAGE = {
  id: "msg-inbox-001",
  threadId: "thread-001",
  labelIds: ["INBOX", "UNREAD"],
  payload: {
    headers: [
      { name: "From", value: "João Silva <joao@empresa.com>" },
      { name: "Subject", value: "Preciso de um orçamento" },
      { name: "Date", value: "Fri, 11 Apr 2026 10:00:00 +0000" },
      { name: "Message-ID", value: "<msg-inbox-001@gmail.com>" },
    ],
    body: { data: Buffer.from("Gostaria de saber o valor dos serviços.").toString("base64url") },
    mimeType: "text/plain",
  },
};

const HISTORY_WITH_MESSAGE = {
  history: [
    {
      id: "100",
      messagesAdded: [
        { message: { id: "msg-inbox-001", threadId: "thread-001", labelIds: ["INBOX"] } },
      ],
    },
  ],
  historyId: "200",
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
describe("parseEmailHeaders", () => {
  it("extrai endereço de e-mail do campo From com nome", () => {
    const result = parseEmailHeaders([
      { name: "From", value: "João Silva <joao@empresa.com>" },
      { name: "Subject", value: "Teste" },
    ]);
    expect(result.from).toBe("joao@empresa.com");
  });

  it("extrai nome do remetente quando presente", () => {
    const result = parseEmailHeaders([
      { name: "From", value: "João Silva <joao@empresa.com>" },
      { name: "Subject", value: "Teste" },
    ]);
    expect(result.fromName).toBe("João Silva");
  });

  it("funciona com From sem nome (só e-mail)", () => {
    const result = parseEmailHeaders([
      { name: "From", value: "joao@empresa.com" },
      { name: "Subject", value: "Teste" },
    ]);
    expect(result.from).toBe("joao@empresa.com");
    expect(result.fromName).toBe("joao@empresa.com");
  });

  it("extrai assunto corretamente", () => {
    const result = parseEmailHeaders([
      { name: "From", value: "a@b.com" },
      { name: "Subject", value: "Proposta de parceria" },
    ]);
    expect(result.subject).toBe("Proposta de parceria");
  });

  it("retorna subject vazio quando ausente", () => {
    const result = parseEmailHeaders([{ name: "From", value: "a@b.com" }]);
    expect(result.subject).toBe("(sem assunto)");
  });
});

// ---------------------------------------------------------------------------
describe("pollNewEmails", () => {
  it("retorna lista vazia quando não há mensagens novas", async () => {
    const mockGmail = makeMockGmailPoller({
      historyList: { history: [], historyId: "999" },
    });

    const result = await pollNewEmails("500", mockGmail as never);

    expect(result.emails).toHaveLength(0);
  });

  it("retorna historyId atualizado mesmo sem mensagens", async () => {
    const mockGmail = makeMockGmailPoller({
      historyList: { history: [], historyId: "999" },
    });

    const result = await pollNewEmails("500", mockGmail as never);

    expect(result.newHistoryId).toBe("999");
  });

  it("busca detalhes das mensagens adicionadas à INBOX", async () => {
    const mockGmail = makeMockGmailPoller({
      historyList: HISTORY_WITH_MESSAGE,
      messageGet: RAW_MESSAGE,
    });

    await pollNewEmails("50", mockGmail as never);

    expect(mockGmail.users.messages.get).toHaveBeenCalledWith(
      expect.objectContaining({ id: "msg-inbox-001", userId: "me" })
    );
  });

  it("retorna emails com campos corretos extraídos", async () => {
    const mockGmail = makeMockGmailPoller({
      historyList: HISTORY_WITH_MESSAGE,
      messageGet: RAW_MESSAGE,
    });

    const result = await pollNewEmails("50", mockGmail as never);

    expect(result.emails).toHaveLength(1);
    expect(result.emails[0].from).toBe("joao@empresa.com");
    expect(result.emails[0].subject).toBe("Preciso de um orçamento");
    expect(result.emails[0].messageId).toBe("msg-inbox-001");
  });

  it("ignora mensagens sem label INBOX (enviados, spam, etc.)", async () => {
    const historyWithSent = {
      history: [
        {
          id: "100",
          messagesAdded: [
            {
              message: {
                id: "msg-sent-001",
                threadId: "thread-001",
                labelIds: ["SENT"], // não é INBOX
              },
            },
          ],
        },
      ],
      historyId: "200",
    };

    const mockGmail = makeMockGmailPoller({ historyList: historyWithSent });

    const result = await pollNewEmails("50", mockGmail as never);

    expect(result.emails).toHaveLength(0);
    expect(mockGmail.users.messages.get).not.toHaveBeenCalled();
  });

  it("usa getAuthenticatedClient quando nenhum client é injetado", async () => {
    const mockOAuth = {};
    mockGetAuthenticatedClient.mockResolvedValue(mockOAuth as never);

    try {
      await pollNewEmails("50");
    } catch {
      // ignora erro de API — só verifica que tentou autenticar
    }

    expect(mockGetAuthenticatedClient).toHaveBeenCalledOnce();
  });
});
