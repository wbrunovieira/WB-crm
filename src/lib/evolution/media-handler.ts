import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { downloadMediaMessage } from "./client";
import { uploadFile } from "@/lib/google/drive";
import { getWhatsAppFolder } from "@/lib/google/drive-folders";
import { submitAudioForTranscription } from "@/lib/transcriptor";
import type { EvolutionWebhookData, EvolutionMessageType } from "./types";

const log = logger.child({ context: "whatsapp-media-handler" });

// ─── Type helpers ─────────────────────────────────────────────────────────────

const DOWNLOADABLE_TYPES = new Set<EvolutionMessageType>([
  "audioMessage",
  "videoMessage",
  "imageMessage",
  "documentMessage",
]);

const TRANSCRIBABLE_TYPES = new Set<EvolutionMessageType>([
  "audioMessage",
  "videoMessage",
]);

export function isDownloadableMedia(messageType: EvolutionMessageType): boolean {
  return DOWNLOADABLE_TYPES.has(messageType);
}

export function isTranscribableMedia(messageType: EvolutionMessageType): boolean {
  return TRANSCRIBABLE_TYPES.has(messageType);
}

export function getMediaMimeType(data: EvolutionWebhookData): string | null {
  const msg = data.message;
  if (!msg) return null;
  switch (data.messageType) {
    case "audioMessage":    return msg.audioMessage?.mimetype ?? null;
    case "videoMessage":    return msg.videoMessage?.mimetype ?? null;
    case "imageMessage":    return msg.imageMessage?.mimetype ?? null;
    case "documentMessage": return msg.documentMessage?.mimetype ?? null;
    default:                return null;
  }
}

/** Extensão baseada no mimeType (simplificado). */
function extFromMime(mime: string | null | undefined): string {
  if (!mime) return "bin";
  if (mime.includes("ogg"))  return "ogg";
  if (mime.includes("mp4"))  return "mp4";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp3") || mime.includes("mpeg")) return "mp3";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("png"))  return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("pdf"))  return "pdf";
  return "bin";
}

export function getMediaFileName(data: EvolutionWebhookData): string {
  const msg = data.message;
  const messageId = data.key.id;

  // Document: usar o nome original
  if (data.messageType === "documentMessage" && msg?.documentMessage?.fileName) {
    return msg.documentMessage.fileName;
  }

  const mime = getMediaMimeType(data);
  const ext = extFromMime(mime);
  const prefix = data.messageType.replace("Message", "");
  return `${prefix}-${messageId}.${ext}`;
}

// ─── Download via Evolution API ───────────────────────────────────────────────

export async function downloadMediaFromEvolution(
  data: EvolutionWebhookData
): Promise<{ buffer: Buffer; mimeType: string; fileName: string } | null> {
  if (!isDownloadableMedia(data.messageType)) return null;

  try {
    const result = await downloadMediaMessage({
      key: data.key,
      message: data.message as Record<string, unknown> | null,
    });

    const buffer = Buffer.from(result.base64, "base64");
    return {
      buffer,
      mimeType: result.mimeType,
      fileName: result.fileName || getMediaFileName(data),
    };
  } catch (err) {
    log.warn("Falha ao baixar mídia do Evolution API", {
      messageId: data.key.id,
      messageType: data.messageType,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// ─── Orchestration ────────────────────────────────────────────────────────────

export interface ProcessMediaOptions {
  data: EvolutionWebhookData;
  whatsAppMessageId: string;
  entityName: string;
  senderName: string;
}

/**
 * Orquestra download → upload Drive → transcrição para uma mensagem com mídia.
 * Nunca lança exceção — erros são logados e ignorados.
 */
export async function processMessageMedia(opts: ProcessMediaOptions): Promise<void> {
  const { data, whatsAppMessageId, entityName, senderName } = opts;

  if (!isDownloadableMedia(data.messageType)) return;

  try {
    // 1. Download do Evolution API
    const downloaded = await downloadMediaFromEvolution(data);
    if (!downloaded) return;

    const { buffer, mimeType, fileName } = downloaded;

    // 2. Upload para Drive — pasta WB-CRM/WhatsApp/{entityName}/
    const folderId = await getWhatsAppFolder(entityName);
    const uploaded = await uploadFile({
      name: fileName,
      mimeType,
      content: buffer,
      folderId,
    });

    // 3. Salvar Drive ID + URL + mimeType no WhatsAppMessage
    const updateData: Record<string, unknown> = {
      mediaDriveId: uploaded.id,
      mediaUrl: uploaded.webViewLink,
      mediaMimeType: mimeType,
    };

    // 4. Para áudio/vídeo: submeter transcrição
    if (isTranscribableMedia(data.messageType)) {
      try {
        const { jobId } = await submitAudioForTranscription(buffer, fileName);
        updateData.mediaTranscriptionJobId = jobId;
        log.info("Áudio/vídeo submetido para transcrição", {
          messageId: data.key.id,
          jobId,
          senderName,
        });
      } catch (err) {
        log.warn("Falha ao submeter transcrição, mídia salva sem job", {
          messageId: data.key.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    await prisma.whatsAppMessage.update({
      where: { id: whatsAppMessageId },
      data: updateData,
    });

    log.info("Mídia WhatsApp processada", {
      messageId: data.key.id,
      messageType: data.messageType,
      driveId: uploaded.id,
      hasTranscription: !!updateData.mediaTranscriptionJobId,
    });
  } catch (err) {
    log.error("Erro ao processar mídia WhatsApp", {
      messageId: data.key.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
