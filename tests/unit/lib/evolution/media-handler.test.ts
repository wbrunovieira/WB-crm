/**
 * WhatsApp Media Handler Tests (TDD)
 *
 * Tests for src/lib/evolution/media-handler.ts
 * - isDownloadableMedia: identifica tipos de mensagem com mídia
 * - isTranscribableMedia: identifica áudio e vídeo para transcrição
 * - getMediaMimeType: extrai mimeType do payload da mensagem
 * - getMediaFileName: gera nome de arquivo adequado
 * - downloadMediaFromEvolution: baixa mídia via Evolution API
 * - processMessageMedia: orquestra download → Drive → Transcritor
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isDownloadableMedia,
  isTranscribableMedia,
  getMediaMimeType,
  getMediaFileName,
  downloadMediaFromEvolution,
  processMessageMedia,
} from "@/lib/evolution/media-handler";
import type { EvolutionWebhookData } from "@/lib/evolution/types";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/evolution/client", () => ({
  downloadMediaMessage: vi.fn(),
}));

vi.mock("@/lib/google/drive", () => ({
  uploadFile: vi.fn(),
}));

vi.mock("@/lib/google/drive-folders", () => ({
  getWhatsAppFolder: vi.fn(),
}));

vi.mock("@/lib/transcriptor", () => ({
  submitAudioForTranscription: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    whatsAppMessage: {
      update: vi.fn(),
    },
  },
}));

import { downloadMediaMessage } from "@/lib/evolution/client";
import { uploadFile } from "@/lib/google/drive";
import { getWhatsAppFolder } from "@/lib/google/drive-folders";
import { submitAudioForTranscription } from "@/lib/transcriptor";
import { prisma } from "@/lib/prisma";

const mockDownload = vi.mocked(downloadMediaMessage);
const mockUpload = vi.mocked(uploadFile);
const mockGetFolder = vi.mocked(getWhatsAppFolder);
const mockSubmitTranscription = vi.mocked(submitAudioForTranscription);
const mockPrismaUpdate = vi.mocked(prisma.whatsAppMessage.update);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseKey = { id: "MSG-001", fromMe: false, remoteJid: "5511999998888@s.whatsapp.net" };

const audioData: EvolutionWebhookData = {
  key: baseKey,
  messageType: "audioMessage",
  message: { audioMessage: { seconds: 45, mimetype: "audio/ogg; codecs=opus" } },
  messageTimestamp: 1775839536,
};

const videoData: EvolutionWebhookData = {
  key: { ...baseKey, id: "MSG-002" },
  messageType: "videoMessage",
  message: { videoMessage: { seconds: 12, caption: "Veja", mimetype: "video/mp4" } },
  messageTimestamp: 1775839600,
};

const imageData: EvolutionWebhookData = {
  key: { ...baseKey, id: "MSG-003" },
  messageType: "imageMessage",
  message: { imageMessage: { caption: "Logo", mimetype: "image/jpeg" } },
  messageTimestamp: 1775839700,
};

const documentData: EvolutionWebhookData = {
  key: { ...baseKey, id: "MSG-004" },
  messageType: "documentMessage",
  message: { documentMessage: { fileName: "proposta.pdf", mimetype: "application/pdf" } },
  messageTimestamp: 1775839800,
};

const textData: EvolutionWebhookData = {
  key: { ...baseKey, id: "MSG-005" },
  messageType: "conversation",
  message: { conversation: "Olá!" },
  messageTimestamp: 1775839900,
};

const stickerData: EvolutionWebhookData = {
  key: { ...baseKey, id: "MSG-006" },
  messageType: "stickerMessage",
  message: { stickerMessage: {} },
  messageTimestamp: 1775840000,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetFolder.mockResolvedValue("folder-id-whatsapp");
  mockUpload.mockResolvedValue({ id: "drive-file-id", webViewLink: "https://drive.google.com/file/d/drive-file-id/view" });
  mockDownload.mockResolvedValue({ base64: Buffer.from("audio-content").toString("base64"), mimeType: "audio/ogg", fileName: "audio.ogg" });
  mockSubmitTranscription.mockResolvedValue({ jobId: "job-123", status: "pending" });
  mockPrismaUpdate.mockResolvedValue({} as any);
});

// ─── isDownloadableMedia ──────────────────────────────────────────────────────

describe("isDownloadableMedia", () => {
  it("retorna true para audioMessage", () => {
    expect(isDownloadableMedia("audioMessage")).toBe(true);
  });

  it("retorna true para videoMessage", () => {
    expect(isDownloadableMedia("videoMessage")).toBe(true);
  });

  it("retorna true para imageMessage", () => {
    expect(isDownloadableMedia("imageMessage")).toBe(true);
  });

  it("retorna true para documentMessage", () => {
    expect(isDownloadableMedia("documentMessage")).toBe(true);
  });

  it("retorna false para conversation", () => {
    expect(isDownloadableMedia("conversation")).toBe(false);
  });

  it("retorna false para extendedTextMessage", () => {
    expect(isDownloadableMedia("extendedTextMessage")).toBe(false);
  });

  it("retorna false para stickerMessage", () => {
    expect(isDownloadableMedia("stickerMessage")).toBe(false);
  });

  it("retorna false para locationMessage", () => {
    expect(isDownloadableMedia("locationMessage")).toBe(false);
  });
});

// ─── isTranscribableMedia ─────────────────────────────────────────────────────

describe("isTranscribableMedia", () => {
  it("retorna true para audioMessage", () => {
    expect(isTranscribableMedia("audioMessage")).toBe(true);
  });

  it("retorna true para videoMessage", () => {
    expect(isTranscribableMedia("videoMessage")).toBe(true);
  });

  it("retorna false para imageMessage", () => {
    expect(isTranscribableMedia("imageMessage")).toBe(false);
  });

  it("retorna false para documentMessage", () => {
    expect(isTranscribableMedia("documentMessage")).toBe(false);
  });

  it("retorna false para conversation", () => {
    expect(isTranscribableMedia("conversation")).toBe(false);
  });
});

// ─── getMediaMimeType ─────────────────────────────────────────────────────────

describe("getMediaMimeType", () => {
  it("retorna mimeType do audioMessage", () => {
    expect(getMediaMimeType(audioData)).toBe("audio/ogg; codecs=opus");
  });

  it("retorna mimeType do videoMessage", () => {
    expect(getMediaMimeType(videoData)).toBe("video/mp4");
  });

  it("retorna mimeType do imageMessage", () => {
    expect(getMediaMimeType(imageData)).toBe("image/jpeg");
  });

  it("retorna mimeType do documentMessage", () => {
    expect(getMediaMimeType(documentData)).toBe("application/pdf");
  });

  it("retorna null para mensagem de texto", () => {
    expect(getMediaMimeType(textData)).toBeNull();
  });
});

// ─── getMediaFileName ─────────────────────────────────────────────────────────

describe("getMediaFileName", () => {
  it("usa fileName do documentMessage quando disponível", () => {
    expect(getMediaFileName(documentData)).toBe("proposta.pdf");
  });

  it("gera nome para audioMessage com extensão .ogg", () => {
    const name = getMediaFileName(audioData);
    expect(name).toMatch(/^audio-MSG-001\.(ogg|mp4|mp3|mpeg)$/);
  });

  it("gera nome para videoMessage com extensão .mp4", () => {
    const name = getMediaFileName(videoData);
    expect(name).toMatch(/^video-MSG-002\.(mp4|avi|mov|webm)$/);
  });

  it("gera nome para imageMessage com extensão .jpg ou .jpeg", () => {
    const name = getMediaFileName(imageData);
    expect(name).toMatch(/^image-MSG-003\.(jpg|jpeg|png|webp)$/);
  });
});

// ─── downloadMediaFromEvolution ───────────────────────────────────────────────

describe("downloadMediaFromEvolution", () => {
  it("chama downloadMediaMessage com o payload correto", async () => {
    await downloadMediaFromEvolution(audioData);

    expect(mockDownload).toHaveBeenCalledWith({
      key: audioData.key,
      message: audioData.message,
    });
  });

  it("retorna buffer e mimeType do resultado", async () => {
    const result = await downloadMediaFromEvolution(audioData);

    expect(result).not.toBeNull();
    expect(result!.buffer).toBeInstanceOf(Buffer);
    expect(result!.mimeType).toBe("audio/ogg");
    expect(result!.fileName).toBe("audio.ogg");
  });

  it("retorna null quando Evolution API falha", async () => {
    mockDownload.mockRejectedValueOnce(new Error("Evolution timeout"));

    const result = await downloadMediaFromEvolution(audioData);

    expect(result).toBeNull();
  });

  it("retorna null para tipo sem mídia (conversation)", async () => {
    const result = await downloadMediaFromEvolution(textData);

    expect(result).toBeNull();
    expect(mockDownload).not.toHaveBeenCalled();
  });
});

// ─── processMessageMedia ──────────────────────────────────────────────────────

describe("processMessageMedia", () => {
  const WA_MSG_ID = "wamsg-db-id";
  const ENTITY_NAME = "João Silva";
  const FROM_ME_LABEL = "Você";
  const CLIENT_LABEL = "João Silva";

  it("faz upload no Drive e salva mediaDriveId no WhatsAppMessage", async () => {
    await processMessageMedia({
      data: audioData,
      whatsAppMessageId: WA_MSG_ID,
      entityName: ENTITY_NAME,
      senderName: CLIENT_LABEL,
    });

    expect(mockUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        folderId: "folder-id-whatsapp",
      })
    );

    expect(mockPrismaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: WA_MSG_ID },
        data: expect.objectContaining({
          mediaDriveId: "drive-file-id",
          mediaUrl: expect.stringContaining("drive-file-id"),
          mediaMimeType: expect.any(String),
        }),
      })
    );
  });

  it("submete áudio para transcrição e salva jobId", async () => {
    await processMessageMedia({
      data: audioData,
      whatsAppMessageId: WA_MSG_ID,
      entityName: ENTITY_NAME,
      senderName: CLIENT_LABEL,
    });

    expect(mockSubmitTranscription).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringMatching(/audio/)
    );

    expect(mockPrismaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mediaTranscriptionJobId: "job-123",
        }),
      })
    );
  });

  it("submete vídeo para transcrição", async () => {
    await processMessageMedia({
      data: videoData,
      whatsAppMessageId: WA_MSG_ID,
      entityName: ENTITY_NAME,
      senderName: CLIENT_LABEL,
    });

    expect(mockSubmitTranscription).toHaveBeenCalled();
  });

  it("não submete imagem para transcrição", async () => {
    await processMessageMedia({
      data: imageData,
      whatsAppMessageId: WA_MSG_ID,
      entityName: ENTITY_NAME,
      senderName: CLIENT_LABEL,
    });

    expect(mockSubmitTranscription).not.toHaveBeenCalled();
  });

  it("não submete documento para transcrição", async () => {
    await processMessageMedia({
      data: documentData,
      whatsAppMessageId: WA_MSG_ID,
      entityName: ENTITY_NAME,
      senderName: CLIENT_LABEL,
    });

    expect(mockSubmitTranscription).not.toHaveBeenCalled();
  });

  it("não faz nada para mensagem de texto", async () => {
    await processMessageMedia({
      data: textData,
      whatsAppMessageId: WA_MSG_ID,
      entityName: ENTITY_NAME,
      senderName: CLIENT_LABEL,
    });

    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockSubmitTranscription).not.toHaveBeenCalled();
    expect(mockPrismaUpdate).not.toHaveBeenCalled();
  });

  it("não lança exceção se download falhar", async () => {
    mockDownload.mockRejectedValueOnce(new Error("Network error"));

    await expect(
      processMessageMedia({
        data: audioData,
        whatsAppMessageId: WA_MSG_ID,
        entityName: ENTITY_NAME,
        senderName: CLIENT_LABEL,
      })
    ).resolves.not.toThrow();
  });

  it("não lança exceção se upload Drive falhar", async () => {
    mockUpload.mockRejectedValueOnce(new Error("Drive quota exceeded"));

    await expect(
      processMessageMedia({
        data: audioData,
        whatsAppMessageId: WA_MSG_ID,
        entityName: ENTITY_NAME,
        senderName: CLIENT_LABEL,
      })
    ).resolves.not.toThrow();
  });

  it("busca pasta WhatsApp com nome da entidade", async () => {
    await processMessageMedia({
      data: imageData,
      whatsAppMessageId: WA_MSG_ID,
      entityName: "Lead ABC",
      senderName: CLIENT_LABEL,
    });

    expect(mockGetFolder).toHaveBeenCalledWith("Lead ABC");
  });
});
