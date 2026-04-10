/**
 * Evolution Message Activity Creator Tests
 *
 * Tests for src/lib/evolution/message-activity-creator.ts
 * - Extrai texto de diferentes tipos de mensagem
 * - Gera mediaLabel para áudio/imagem/vídeo/documento
 * - Agrupa mensagens da mesma conversa (sessão 2h)
 * - Cria nova Activity quando sessão expirou ou não existe
 * - Atualiza Activity existente quando sessão está aberta
 * - Cria WhatsAppMessage para cada mensagem (idempotência)
 * - Vincula a Contact/Lead/Partner quando número encontrado
 * - Cria Activity sem vínculo para números desconhecidos
 * - Não processa mensagem já existente (idempotência por messageId)
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  extractText,
  extractMediaLabel,
  processWhatsAppMessage,
} from "@/lib/evolution/message-activity-creator";
import { prismaMock } from "../../../setup";
import type { EvolutionWebhookData } from "@/lib/evolution/types";

vi.mock("@/lib/evolution/number-matcher", () => ({
  matchPhoneToEntity: vi.fn(),
  extractPhoneFromJid: vi.fn((jid: string) => jid.replace(/@.*$/, "")),
}));

import { matchPhoneToEntity } from "@/lib/evolution/number-matcher";
const mockMatch = vi.mocked(matchPhoneToEntity);

const OWNER_ID = "user-owner-123";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseData: EvolutionWebhookData = {
  key: {
    id: "MSG-001",
    fromMe: false,
    remoteJid: "5511999998888@s.whatsapp.net",
  },
  pushName: "João Silva",
  messageType: "conversation",
  message: { conversation: "Olá, preciso de um orçamento" },
  messageTimestamp: 1775839536,
};

const sentData: EvolutionWebhookData = {
  ...baseData,
  key: { ...baseData.key, id: "MSG-002", fromMe: true },
  pushName: undefined,
  message: { conversation: "Claro! Vou preparar e te envio" },
  messageTimestamp: 1775839600,
};

const audioData: EvolutionWebhookData = {
  ...baseData,
  key: { ...baseData.key, id: "MSG-003" },
  messageType: "audioMessage",
  message: { audioMessage: { seconds: 45, mimetype: "audio/ogg; codecs=opus" } },
};

const imageData: EvolutionWebhookData = {
  ...baseData,
  key: { ...baseData.key, id: "MSG-004" },
  messageType: "imageMessage",
  message: { imageMessage: { caption: "Segue o logo", mimetype: "image/jpeg" } },
};

const imageNoCaption: EvolutionWebhookData = {
  ...baseData,
  key: { ...baseData.key, id: "MSG-005" },
  messageType: "imageMessage",
  message: { imageMessage: { mimetype: "image/jpeg" } },
};

const videoData: EvolutionWebhookData = {
  ...baseData,
  key: { ...baseData.key, id: "MSG-006" },
  messageType: "videoMessage",
  message: { videoMessage: { seconds: 12, caption: "Veja este vídeo", mimetype: "video/mp4" } },
};

const documentData: EvolutionWebhookData = {
  ...baseData,
  key: { ...baseData.key, id: "MSG-007" },
  messageType: "documentMessage",
  message: {
    documentMessage: {
      fileName: "proposta-comercial.pdf",
      mimetype: "application/pdf",
    },
  },
};

const stickerData: EvolutionWebhookData = {
  ...baseData,
  key: { ...baseData.key, id: "MSG-008" },
  messageType: "stickerMessage",
  message: { stickerMessage: {} },
};

const extendedTextData: EvolutionWebhookData = {
  ...baseData,
  key: { ...baseData.key, id: "MSG-009" },
  messageType: "extendedTextMessage",
  message: { extendedTextMessage: { text: "Confira: https://exemplo.com" } },
};

function makeExistingMessage(activityId: string, minutesAgo = 10) {
  const ts = new Date(Date.now() - minutesAgo * 60 * 1000);
  return {
    id: "wamsg-existing-1",
    messageId: "MSG-PREV",
    remoteJid: "5511999998888@s.whatsapp.net",
    fromMe: false,
    activityId,
    timestamp: ts,
    activity: {
      id: activityId,
      description: "[10:00] João Silva: Mensagem anterior",
    },
  };
}

beforeEach(() => {
  mockMatch.mockResolvedValue(null);
  prismaMock.whatsAppMessage.findUnique.mockResolvedValue(null);
  prismaMock.whatsAppMessage.findFirst.mockResolvedValue(null);
  prismaMock.whatsAppMessage.create.mockResolvedValue({ id: "wamsg-1" } as any);
  prismaMock.activity.create.mockResolvedValue({ id: "activity-new-1" } as any);
  prismaMock.activity.update.mockResolvedValue({ id: "activity-existing-1" } as any);
});

// ---------------------------------------------------------------------------
// extractText
// ---------------------------------------------------------------------------

describe("extractText", () => {
  it("retorna texto de mensagem 'conversation'", () => {
    expect(extractText(baseData)).toBe("Olá, preciso de um orçamento");
  });

  it("retorna texto de 'extendedTextMessage'", () => {
    expect(extractText(extendedTextData)).toBe("Confira: https://exemplo.com");
  });

  it("retorna caption de 'imageMessage'", () => {
    expect(extractText(imageData)).toBe("Segue o logo");
  });

  it("retorna caption de 'videoMessage'", () => {
    expect(extractText(videoData)).toBe("Veja este vídeo");
  });

  it("retorna null para imagem sem caption", () => {
    expect(extractText(imageNoCaption)).toBeNull();
  });

  it("retorna null para áudio (sem texto)", () => {
    expect(extractText(audioData)).toBeNull();
  });

  it("retorna null para sticker", () => {
    expect(extractText(stickerData)).toBeNull();
  });

  it("retorna null quando message é null", () => {
    const data = { ...baseData, message: null };
    expect(extractText(data)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractMediaLabel
// ---------------------------------------------------------------------------

describe("extractMediaLabel", () => {
  it("retorna '🎤 Áudio (45s)' para audioMessage com duração", () => {
    expect(extractMediaLabel(audioData)).toBe("🎤 Áudio (45s)");
  });

  it("retorna '🎤 Áudio' para audioMessage sem duração", () => {
    const noSeconds = {
      ...audioData,
      message: { audioMessage: { mimetype: "audio/ogg" } },
    };
    expect(extractMediaLabel(noSeconds)).toBe("🎤 Áudio");
  });

  it("retorna '📷 Imagem' para imageMessage", () => {
    expect(extractMediaLabel(imageData)).toBe("📷 Imagem");
  });

  it("retorna '📹 Vídeo (12s)' para videoMessage com duração", () => {
    expect(extractMediaLabel(videoData)).toBe("📹 Vídeo (12s)");
  });

  it("retorna '📄 proposta-comercial.pdf' para documentMessage com nome", () => {
    expect(extractMediaLabel(documentData)).toBe("📄 proposta-comercial.pdf");
  });

  it("retorna '📄 Documento' para documentMessage sem nome", () => {
    const noName = {
      ...documentData,
      message: { documentMessage: { mimetype: "application/pdf" } },
    };
    expect(extractMediaLabel(noName)).toBe("📄 Documento");
  });

  it("retorna '🎭 Sticker' para stickerMessage", () => {
    expect(extractMediaLabel(stickerData)).toBe("🎭 Sticker");
  });

  it("retorna null para mensagem de texto (conversation)", () => {
    expect(extractMediaLabel(baseData)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// processWhatsAppMessage — idempotência
// ---------------------------------------------------------------------------

describe("processWhatsAppMessage — idempotência", () => {
  it("não cria Activity se messageId já existe", async () => {
    prismaMock.whatsAppMessage.findUnique.mockResolvedValue({ id: "wamsg-existing" } as any);

    await processWhatsAppMessage(baseData, OWNER_ID);

    expect(prismaMock.activity.create).not.toHaveBeenCalled();
    expect(prismaMock.activity.update).not.toHaveBeenCalled();
    expect(prismaMock.whatsAppMessage.create).not.toHaveBeenCalled();
  });

  it("processa normalmente se messageId ainda não existe", async () => {
    prismaMock.whatsAppMessage.findUnique.mockResolvedValue(null);

    await processWhatsAppMessage(baseData, OWNER_ID);

    expect(prismaMock.activity.create).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// processWhatsAppMessage — nova sessão
// ---------------------------------------------------------------------------

describe("processWhatsAppMessage — nova sessão", () => {
  it("cria Activity do tipo 'whatsapp'", async () => {
    await processWhatsAppMessage(baseData, OWNER_ID);

    expect(prismaMock.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "whatsapp" }),
      })
    );
  });

  it("marca Activity como completed=true", async () => {
    await processWhatsAppMessage(baseData, OWNER_ID);

    expect(prismaMock.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ completed: true }),
      })
    );
  });

  it("description contém o texto da mensagem", async () => {
    await processWhatsAppMessage(baseData, OWNER_ID);

    const call = prismaMock.activity.create.mock.calls[0][0];
    expect(call.data.description).toContain("Olá, preciso de um orçamento");
  });

  it("description identifica sender por nome quando fromMe=false", async () => {
    await processWhatsAppMessage(baseData, OWNER_ID);

    const call = prismaMock.activity.create.mock.calls[0][0];
    expect(call.data.description).toContain("João Silva");
  });

  it("description identifica sender como 'Você' quando fromMe=true", async () => {
    await processWhatsAppMessage(sentData, OWNER_ID);

    const call = prismaMock.activity.create.mock.calls[0][0];
    expect(call.data.description).toContain("Você");
  });

  it("description contém mediaLabel para áudio (sem texto)", async () => {
    await processWhatsAppMessage(audioData, OWNER_ID);

    const call = prismaMock.activity.create.mock.calls[0][0];
    expect(call.data.description).toContain("🎤 Áudio (45s)");
  });

  it("cria WhatsAppMessage vinculado à nova Activity", async () => {
    prismaMock.activity.create.mockResolvedValue({ id: "activity-new-1" } as any);

    await processWhatsAppMessage(baseData, OWNER_ID);

    expect(prismaMock.whatsAppMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          messageId: "MSG-001",
          remoteJid: "5511999998888@s.whatsapp.net",
          fromMe: false,
          activityId: "activity-new-1",
          ownerId: OWNER_ID,
        }),
      })
    );
  });

  it("salva o texto na WhatsAppMessage", async () => {
    await processWhatsAppMessage(baseData, OWNER_ID);

    expect(prismaMock.whatsAppMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          text: "Olá, preciso de um orçamento",
        }),
      })
    );
  });

  it("salva o mediaLabel na WhatsAppMessage para áudio", async () => {
    await processWhatsAppMessage(audioData, OWNER_ID);

    expect(prismaMock.whatsAppMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mediaLabel: "🎤 Áudio (45s)",
        }),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// processWhatsAppMessage — sessão aberta (agrupamento 2h)
// ---------------------------------------------------------------------------

describe("processWhatsAppMessage — sessão aberta (agrupamento)", () => {
  it("atualiza Activity existente quando sessão está aberta (< 2h)", async () => {
    const existing = makeExistingMessage("activity-existing-1", 30); // 30 min atrás
    prismaMock.whatsAppMessage.findFirst.mockResolvedValue(existing as any);

    await processWhatsAppMessage(baseData, OWNER_ID);

    expect(prismaMock.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "activity-existing-1" },
      })
    );
    expect(prismaMock.activity.create).not.toHaveBeenCalled();
  });

  it("description atualizada contém mensagem anterior + nova mensagem", async () => {
    const existing = makeExistingMessage("activity-existing-1", 30);
    prismaMock.whatsAppMessage.findFirst.mockResolvedValue(existing as any);

    await processWhatsAppMessage(baseData, OWNER_ID);

    const call = prismaMock.activity.update.mock.calls[0][0];
    expect(call.data.description).toContain("[10:00] João Silva: Mensagem anterior");
    expect(call.data.description).toContain("Olá, preciso de um orçamento");
  });

  it("cria nova Activity quando última mensagem foi há mais de 2h", async () => {
    // findFirst retorna null (sem sessão aberta)
    prismaMock.whatsAppMessage.findFirst.mockResolvedValue(null);

    await processWhatsAppMessage(baseData, OWNER_ID);

    expect(prismaMock.activity.create).toHaveBeenCalled();
    expect(prismaMock.activity.update).not.toHaveBeenCalled();
  });

  it("WhatsAppMessage criada aponta para Activity da sessão aberta", async () => {
    const existing = makeExistingMessage("activity-existing-1", 30);
    prismaMock.whatsAppMessage.findFirst.mockResolvedValue(existing as any);

    await processWhatsAppMessage(baseData, OWNER_ID);

    expect(prismaMock.whatsAppMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ activityId: "activity-existing-1" }),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// processWhatsAppMessage — vinculação de entidade
// ---------------------------------------------------------------------------

describe("processWhatsAppMessage — vinculação de entidade", () => {
  it("vincula contactId quando número encontrado em Contact", async () => {
    mockMatch.mockResolvedValue({
      entityType: "contact",
      entityId: "contact-1",
      contactId: "contact-1",
    });

    await processWhatsAppMessage(baseData, OWNER_ID);

    expect(prismaMock.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ contactId: "contact-1" }),
      })
    );
  });

  it("vincula leadId quando número encontrado em Lead", async () => {
    mockMatch.mockResolvedValue({
      entityType: "lead",
      entityId: "lead-1",
      leadId: "lead-1",
    });

    await processWhatsAppMessage(baseData, OWNER_ID);

    expect(prismaMock.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ leadId: "lead-1" }),
      })
    );
  });

  it("vincula partnerId quando número encontrado em Partner", async () => {
    mockMatch.mockResolvedValue({
      entityType: "partner",
      entityId: "partner-1",
      partnerId: "partner-1",
    });

    await processWhatsAppMessage(baseData, OWNER_ID);

    expect(prismaMock.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ partnerId: "partner-1" }),
      })
    );
  });

  it("cria Activity sem vínculo para número desconhecido", async () => {
    mockMatch.mockResolvedValue(null);

    await processWhatsAppMessage(baseData, OWNER_ID);

    expect(prismaMock.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contactId: null,
          leadId: null,
          partnerId: null,
        }),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// processWhatsAppMessage — resiliência
// ---------------------------------------------------------------------------

describe("processWhatsAppMessage — resiliência", () => {
  it("não lança exceção se matchPhoneToEntity falhar", async () => {
    mockMatch.mockRejectedValue(new Error("DB timeout"));

    await expect(
      processWhatsAppMessage(baseData, OWNER_ID)
    ).resolves.not.toThrow();
  });

  it("ainda cria Activity mesmo se match falhar (sem vínculo)", async () => {
    mockMatch.mockRejectedValue(new Error("DB timeout"));

    await processWhatsAppMessage(baseData, OWNER_ID);

    expect(prismaMock.activity.create).toHaveBeenCalled();
  });
});
