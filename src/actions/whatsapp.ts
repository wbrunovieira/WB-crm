"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendTextMessage } from "@/lib/evolution/client";
import { processWhatsAppMessage } from "@/lib/evolution/message-activity-creator";
import { logger } from "@/lib/logger";

const log = logger.child({ context: "whatsapp-action" });

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendWhatsAppMessage(
  to: string,
  text: string,
  contactName?: string
): Promise<SendResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { success: false, error: "Não autorizado" };
  }

  if (!to || !to.trim()) {
    return { success: false, error: "Número de destino obrigatório" };
  }

  if (!text || !text.trim()) {
    return { success: false, error: "Texto da mensagem obrigatório" };
  }

  try {
    const response = await sendTextMessage(to, text);

    // Criar Activity imediatamente sem aguardar o webhook.
    // O webhook pode não disparar de forma confiável para mensagens fromMe=true.
    // O unique constraint em messageId garante idempotência caso o webhook chegue depois.
    const digits = to.replace(/\D/g, "");
    const remoteJid = digits.includes("@")
      ? digits
      : `${digits}@s.whatsapp.net`;

    const webhookData = {
      key: {
        id: response.key.id,
        fromMe: true,
        remoteJid: response.key.remoteJid ?? remoteJid,
      },
      pushName: contactName,
      messageType: "conversation" as const,
      message: { conversation: text },
      messageTimestamp: response.messageTimestamp ?? Math.floor(Date.now() / 1000),
    };

    try {
      await processWhatsAppMessage(webhookData, session.user.id);
    } catch (err) {
      log.warn("Falha ao criar Activity para mensagem enviada", {
        messageId: response.key.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return { success: true, messageId: response.key.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao enviar mensagem",
    };
  }
}
