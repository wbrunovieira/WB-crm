"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendTextMessage } from "@/lib/evolution/client";

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendWhatsAppMessage(
  to: string,
  text: string
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
    return { success: true, messageId: response.key.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao enviar mensagem",
    };
  }
}
