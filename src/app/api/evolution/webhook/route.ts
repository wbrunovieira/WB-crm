import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { isGroupJid } from "@/lib/evolution/number-matcher";
import { processWhatsAppMessage } from "@/lib/evolution/message-activity-creator";
import type { EvolutionWebhookPayload } from "@/lib/evolution/types";

const log = logger.child({ context: "evolution-webhook" });

const N8N_FORWARD_URL = "http://n8n:5678/webhook/evolution";

function validateSecret(req: NextRequest): boolean {
  const expected = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (!expected) {
    log.warn("EVOLUTION_WEBHOOK_SECRET não configurado");
    return false;
  }
  return req.headers.get("x-webhook-secret") === expected;
}

/** Forward do payload para o n8n em background (não bloqueia resposta) */
function forwardToN8n(rawBody: string): void {
  fetch(N8N_FORWARD_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: rawBody,
  }).catch((err) => {
    log.warn("Falha ao fazer forward para n8n", {
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!validateSecret(req)) {
    log.warn("Evolution webhook: secret inválido ou ausente");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Forward para n8n em background — preserva automações existentes
  forwardToN8n(rawBody);

  let payload: EvolutionWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    log.warn("Evolution webhook: JSON inválido");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Apenas MESSAGES_UPSERT é relevante para o CRM
  if (payload.event !== "messages.upsert") {
    return NextResponse.json({ ok: true });
  }

  const data = payload.data;
  if (!data?.key?.remoteJid) {
    return NextResponse.json({ ok: true });
  }

  // Ignorar grupos
  if (isGroupJid(data.key.remoteJid)) {
    log.debug("Mensagem de grupo ignorada", { remoteJid: data.key.remoteJid });
    return NextResponse.json({ ok: true });
  }

  const ownerId = process.env.EVOLUTION_OWNER_ID;
  if (!ownerId) {
    log.warn("EVOLUTION_OWNER_ID não configurado — mensagem ignorada");
    return NextResponse.json({ ok: true });
  }

  try {
    await processWhatsAppMessage(data, ownerId);
  } catch (err) {
    // Nunca retornar 500 — Evolution poderia reenviar criando loops
    log.error("Erro ao processar mensagem WhatsApp", {
      messageId: data.key.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({ ok: true });
}
