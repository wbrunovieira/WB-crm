import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { matchPhoneToEntity, extractPhoneFromJid } from "./number-matcher";
import { isDownloadableMedia, processMessageMedia } from "./media-handler";
import { emitNotification } from "@/lib/event-bus";
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
    timeZone: "UTC",
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
    log.debug("Mensagem WhatsApp já processada, ignorando", { messageId: key.id });
    return;
  }

  // 2. Extrair número e buscar entidade no CRM
  const phone = extractPhoneFromJid(key.remoteJid);
  let match: Awaited<ReturnType<typeof matchPhoneToEntity>> = null;
  try {
    match = await matchPhoneToEntity(phone, ownerId);
  } catch (err) {
    log.warn("Falha ao buscar entidade pelo número, ignorando mensagem", {
      phone,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 3. Número não encontrado no CRM — ignorar silenciosamente
  //    (número pode ser pessoal ou contato não cadastrado)
  if (!match) {
    log.debug("Número desconhecido — mensagem ignorada", { phone, messageId: key.id });
    return;
  }

  const timestamp = new Date(messageTimestamp * 1000);
  const text = extractText(data);
  const mediaLabel = extractMediaLabel(data);
  const messageLine = formatMessageLine(data);

  // 4. Buscar sessão aberta: última mensagem deste remoteJid nas últimas 2h
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
    // 5a. Sessão aberta — adicionar linha ao log da Activity
    const currentDescription = lastMessage.activity.description ?? "";
    const newDescription = currentDescription + "\n" + messageLine;

    await prisma.activity.update({
      where: { id: lastMessage.activityId },
      data: { description: newDescription },
    });

    activityId = lastMessage.activityId;

    log.debug("Mensagem adicionada à sessão existente", { activityId, messageId: key.id });
  } else {
    // 5b. Nova sessão — criar Activity
    const activity = await prisma.activity.create({
      data: {
        type: "whatsapp",
        subject: buildSubject(data, phone),
        description: messageLine,
        completed: true,
        completedAt: timestamp,
        dueDate: timestamp,
        ownerId,
        contactId: match.contactId ?? null,
        leadId: match.leadId ?? null,
        partnerId: match.partnerId ?? null,
      },
    });

    activityId = activity.id;

    // Notificação apenas em nova sessão (não a cada mensagem)
    const entityLink = match.leadId
      ? `/leads/${match.leadId}`
      : match.contactId
        ? `/contacts/${match.contactId}`
        : match.partnerId
          ? `/partners/${match.partnerId}`
          : undefined;

    const senderName = data.pushName || phone;

    const notification = await prisma.notification.create({
      data: {
        type: "WHATSAPP_RECEIVED",
        status: "completed",
        title: `WhatsApp de ${senderName}`,
        summary: text?.slice(0, 100) ?? mediaLabel ?? "(mensagem)",
        payload: entityLink ? JSON.stringify({ link: entityLink }) : null,
        read: false,
        userId: ownerId,
      },
    });

    emitNotification({
      id: notification.id,
      userId: ownerId,
      type: "WHATSAPP_RECEIVED",
      title: notification.title,
      summary: notification.summary,
      link: entityLink,
      createdAt: notification.createdAt.toISOString(),
    });

    log.info("Nova sessão WhatsApp criada", {
      activityId,
      entityType: match.entityType,
      entityId: match.entityId,
      messageId: key.id,
    });
  }

  // 6. Registrar WhatsAppMessage individual
  const waMessage = await prisma.whatsAppMessage.create({
    data: {
      messageId: key.id,
      remoteJid: key.remoteJid,
      fromMe: key.fromMe,
      messageType: data.messageType,
      pushName: data.pushName ?? null,
      text,
      mediaLabel,
      timestamp,
      activityId,
      ownerId,
    },
  });

  // 7. Processar mídia em background (download → Drive → transcrição)
  if (isDownloadableMedia(data.messageType)) {
    const senderName = key.fromMe ? "Você" : (data.pushName ?? "Cliente");
    const entityName = data.pushName ?? phone;
    processMessageMedia({
      data,
      whatsAppMessageId: waMessage.id,
      entityName,
      senderName,
    }).catch((err) => {
      log.error("Erro ao processar mídia WhatsApp (background)", {
        messageId: key.id,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }
}
