import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { matchPhoneToEntity, extractPhoneFromJid } from "./number-matcher";
import type { EvolutionWebhookData } from "./types";

const log = logger.child({ context: "evolution-message-creator" });

/** Janela de sessão: mensagens do mesmo contato em menos de 2h são agrupadas */
const SESSION_WINDOW_MS = 2 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Extração de conteúdo
// ---------------------------------------------------------------------------

/**
 * Extrai o texto puro da mensagem, cobrindo os tipos mais comuns.
 * Retorna null para mídia sem legenda (áudio, sticker, etc.).
 */
export function extractText(data: EvolutionWebhookData): string | null {
  const msg = data.message;
  if (!msg) return null;

  return (
    msg.conversation ??
    msg.extendedTextMessage?.text ??
    msg.imageMessage?.caption ??
    msg.videoMessage?.caption ??
    msg.documentMessage?.caption ??
    null
  );
}

/**
 * Gera um label com emoji para tipos de mídia sem texto.
 * Retorna null para mensagens de texto (nenhum label necessário).
 */
export function extractMediaLabel(data: EvolutionWebhookData): string | null {
  const msg = data.message;
  if (!msg) return null;

  switch (data.messageType) {
    case "audioMessage": {
      const seconds = msg.audioMessage?.seconds ?? 0;
      return seconds > 0 ? `🎤 Áudio (${seconds}s)` : "🎤 Áudio";
    }
    case "imageMessage":
      return "📷 Imagem";
    case "videoMessage": {
      const seconds = msg.videoMessage?.seconds ?? 0;
      return seconds > 0 ? `📹 Vídeo (${seconds}s)` : "📹 Vídeo";
    }
    case "documentMessage": {
      const name = msg.documentMessage?.fileName;
      return name ? `📄 ${name}` : "📄 Documento";
    }
    case "stickerMessage":
      return "🎭 Sticker";
    case "locationMessage": {
      const place =
        msg.locationMessage?.address ?? msg.locationMessage?.name;
      return place ? `📍 ${place}` : "📍 Localização";
    }
    default:
      return null;
  }
}

function formatMessageLine(data: EvolutionWebhookData): string {
  const date = new Date(data.messageTimestamp * 1000);
  const time = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const sender = data.key.fromMe ? "Você" : (data.pushName ?? "Cliente");
  const content =
    extractText(data) ?? extractMediaLabel(data) ?? "(mensagem sem texto)";
  return `[${time}] ${sender}: ${content}`;
}

function buildSubject(data: EvolutionWebhookData, phone: string): string {
  const name = data.pushName ?? phone;
  return `WhatsApp — ${name}`;
}

// ---------------------------------------------------------------------------
// Lógica principal
// ---------------------------------------------------------------------------

export async function processWhatsAppMessage(
  data: EvolutionWebhookData,
  ownerId: string
): Promise<void> {
  const { key, messageTimestamp } = data;

  // 1. Idempotência: verificar se messageId já foi processado
  const existing = await prisma.whatsAppMessage.findUnique({
    where: { messageId: key.id },
  });
  if (existing) {
    log.debug("Mensagem WhatsApp já processada, ignorando", {
      messageId: key.id,
    });
    return;
  }

  // 2. Extrair número e buscar entidade no CRM
  const phone = extractPhoneFromJid(key.remoteJid);
  let match = null;
  try {
    match = await matchPhoneToEntity(phone, ownerId);
  } catch (err) {
    log.warn("Falha ao buscar entidade pelo número, continuando sem vínculo", {
      phone,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const timestamp = new Date(messageTimestamp * 1000);
  const text = extractText(data);
  const mediaLabel = extractMediaLabel(data);
  const messageLine = formatMessageLine(data);

  // 3. Buscar sessão aberta: última mensagem deste remoteJid nas últimas 2h
  const windowStart = new Date(Date.now() - SESSION_WINDOW_MS);
  const lastMessage = await prisma.whatsAppMessage.findFirst({
    where: {
      remoteJid: key.remoteJid,
      ownerId,
      timestamp: { gte: windowStart },
    },
    orderBy: { timestamp: "desc" },
    include: {
      activity: { select: { id: true, description: true } },
    },
  });

  let activityId: string;

  if (lastMessage?.activityId && lastMessage.activity) {
    // 4a. Sessão aberta — adicionar linha ao log da Activity
    const currentDescription = lastMessage.activity.description ?? "";
    const newDescription = currentDescription + "\n" + messageLine;

    await prisma.activity.update({
      where: { id: lastMessage.activityId },
      data: { description: newDescription },
    });

    activityId = lastMessage.activityId;

    log.debug("Mensagem adicionada à sessão existente", {
      activityId,
      messageId: key.id,
    });
  } else {
    // 4b. Nova sessão — criar Activity
    const activity = await prisma.activity.create({
      data: {
        type: "whatsapp",
        subject: buildSubject(data, phone),
        description: messageLine,
        completed: true,
        completedAt: timestamp,
        dueDate: timestamp,
        ownerId,
        contactId: match?.contactId ?? null,
        leadId: match?.leadId ?? null,
        partnerId: match?.partnerId ?? null,
      },
    });

    activityId = activity.id;

    log.info("Nova sessão WhatsApp criada", {
      activityId,
      entityType: match?.entityType ?? "none",
      entityId: match?.entityId,
      messageId: key.id,
    });
  }

  // 5. Registrar WhatsAppMessage individual
  await prisma.whatsAppMessage.create({
    data: {
      messageId: key.id,
      remoteJid: key.remoteJid,
      fromMe: key.fromMe,
      messageType: data.messageType,
      text,
      mediaLabel,
      timestamp,
      activityId,
      ownerId,
    },
  });
}
