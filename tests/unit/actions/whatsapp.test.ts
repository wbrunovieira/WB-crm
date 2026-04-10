/**
 * WhatsApp Send Action Tests
 *
 * Tests for src/actions/whatsapp.ts
 * - Autenticação obrigatória
 * - Validação de parâmetros
 * - Chama Evolution API com parâmetros corretos
 * - Retorna sucesso com messageId
 * - Retorna erro se Evolution falhar
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendWhatsAppMessage } from "@/actions/whatsapp";

vi.mock("@/lib/evolution/client", () => ({
  sendTextMessage: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/evolution/message-activity-creator", () => ({
  processWhatsAppMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/logger", () => ({
  logger: { child: () => ({ warn: vi.fn(), info: vi.fn(), debug: vi.fn() }) },
}));

import { sendTextMessage } from "@/lib/evolution/client";
import { getServerSession } from "next-auth";
import { processWhatsAppMessage } from "@/lib/evolution/message-activity-creator";

const mockSendText = vi.mocked(sendTextMessage);
const mockGetSession = vi.mocked(getServerSession);
const mockProcessMessage = vi.mocked(processWhatsAppMessage);

const SESSION = {
  user: { id: "user-123", name: "Bruno", email: "bruno@wb.com", role: "admin" },
};

const SEND_RESPONSE = {
  key: { id: "MSGKEY-ABC123", fromMe: true, remoteJid: "5511999998888@s.whatsapp.net" },
  message: { conversation: "Olá!" },
  messageTimestamp: 1775839536,
  status: "PENDING",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(SESSION as any);
  mockSendText.mockResolvedValue(SEND_RESPONSE);
  mockProcessMessage.mockResolvedValue(undefined);
});

describe("sendWhatsAppMessage — autenticação", () => {
  it("retorna erro se usuário não autenticado", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await sendWhatsAppMessage("5511999998888", "Olá!");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/autorizado|autenticado/i);
  });

  it("prossegue quando usuário está autenticado", async () => {
    const result = await sendWhatsAppMessage("5511999998888", "Olá!");

    expect(result.success).toBe(true);
  });
});

describe("sendWhatsAppMessage — validação", () => {
  it("retorna erro se número de destino estiver vazio", async () => {
    const result = await sendWhatsAppMessage("", "Olá!");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("retorna erro se texto da mensagem estiver vazio", async () => {
    const result = await sendWhatsAppMessage("5511999998888", "");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("retorna erro se texto contiver apenas espaços", async () => {
    const result = await sendWhatsAppMessage("5511999998888", "   ");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("sendWhatsAppMessage — chamada à Evolution API", () => {
  it("chama sendTextMessage com número e texto corretos", async () => {
    await sendWhatsAppMessage("5511999998888", "Olá, tudo bem?");

    expect(mockSendText).toHaveBeenCalledWith("5511999998888", "Olá, tudo bem?");
  });

  it("retorna messageId retornado pela API", async () => {
    const result = await sendWhatsAppMessage("5511999998888", "Olá!");

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("MSGKEY-ABC123");
  });
});

describe("sendWhatsAppMessage — tratamento de erros", () => {
  it("retorna erro se Evolution API lançar exceção", async () => {
    mockSendText.mockRejectedValue(new Error("Evolution API error 400: invalid number"));

    const result = await sendWhatsAppMessage("99999999", "Olá!");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Evolution API error");
  });

  it("não lança exceção — sempre retorna objeto de resultado", async () => {
    mockSendText.mockRejectedValue(new Error("timeout"));

    await expect(
      sendWhatsAppMessage("5511999998888", "Olá!")
    ).resolves.toBeDefined();
  });

  it("retorna success mesmo se processWhatsAppMessage falhar", async () => {
    mockProcessMessage.mockRejectedValue(new Error("DB error"));

    const result = await sendWhatsAppMessage("5511999998888", "Olá!");

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("MSGKEY-ABC123");
  });
});

describe("sendWhatsAppMessage — criação de Activity", () => {
  it("chama processWhatsAppMessage após envio bem-sucedido", async () => {
    await sendWhatsAppMessage("5511999998888", "Olá, tudo bem?");

    expect(mockProcessMessage).toHaveBeenCalledOnce();
  });

  it("passa fromMe=true e o texto correto para processWhatsAppMessage", async () => {
    await sendWhatsAppMessage("5511999998888", "Mensagem de teste", "João");

    const [data, ownerId] = mockProcessMessage.mock.calls[0];
    expect(data.key.fromMe).toBe(true);
    expect(data.message?.conversation).toBe("Mensagem de teste");
    expect(data.pushName).toBe("João");
    expect(ownerId).toBe("user-123");
  });

  it("usa remoteJid da resposta da API quando disponível", async () => {
    await sendWhatsAppMessage("5511999998888", "Olá!");

    const [data] = mockProcessMessage.mock.calls[0];
    expect(data.key.remoteJid).toBe("5511999998888@s.whatsapp.net");
  });

  it("não chama processWhatsAppMessage se Evolution API falhar", async () => {
    mockSendText.mockRejectedValue(new Error("timeout"));

    await sendWhatsAppMessage("5511999998888", "Olá!");

    expect(mockProcessMessage).not.toHaveBeenCalled();
  });
});
