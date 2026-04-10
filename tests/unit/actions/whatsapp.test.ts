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

import { sendTextMessage } from "@/lib/evolution/client";
import { getServerSession } from "next-auth";

const mockSendText = vi.mocked(sendTextMessage);
const mockGetSession = vi.mocked(getServerSession);

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
  mockGetSession.mockResolvedValue(SESSION as any);
  mockSendText.mockResolvedValue(SEND_RESPONSE);
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
});
