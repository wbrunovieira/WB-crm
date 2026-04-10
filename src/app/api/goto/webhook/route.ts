import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import type { GoToWebhookPayload } from "@/lib/goto/types";

const log = logger.child({ context: "goto-webhook" });

function validateSecret(req: NextRequest): boolean {
  const expectedSecret = process.env.GOTO_WEBHOOK_SECRET;
  if (!expectedSecret) return false;

  const url = new URL(req.url);
  const providedSecret = url.searchParams.get("secret");
  return providedSecret === expectedSecret;
}

function isGotoPing(body: string | null, req: NextRequest): boolean {
  const userAgent = req.headers.get("user-agent") ?? "";
  const isGoToAgent = userAgent.includes("GoTo Notifications");
  const isEmpty = !body || body.trim() === "";
  return isGoToAgent && isEmpty;
}

async function handleCallEvent(payload: GoToWebhookPayload): Promise<void> {
  const { callEvent } = payload;
  if (!callEvent) return;

  const { conversationSpaceId, direction } = callEvent.metadata;
  const eventType = callEvent.state.type;

  log.info("GoTo call event received", {
    conversationSpaceId,
    direction,
    eventType,
  });

  // Fase 3 irá processar ENDING para criar Activity
  // Fase 5 irá processar para retry engine
}

async function handleReportSummary(payload: GoToWebhookPayload): Promise<void> {
  const { reportSummary } = payload;
  if (!reportSummary) return;

  log.info("GoTo report summary received", {
    conversationSpaceId: reportSummary.conversationSpaceId,
    callCreated: reportSummary.callCreated,
    callEnded: reportSummary.callEnded,
  });

  // Fase 3 irá buscar o relatório completo e criar Activity
  // Fase 6 irá baixar a gravação
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Validar secret (segurança básica)
  if (!validateSecret(req)) {
    log.warn("GoTo webhook: secret inválido ou ausente", {
      url: req.url,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Ler body
  let body: string | null = null;
  try {
    body = await req.text();
  } catch {
    // body vazio é válido (ping)
  }

  // 3. Responder ao ping de verificação do GoTo
  if (isGotoPing(body, req)) {
    log.info("GoTo webhook: ping de verificação respondido");
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // 4. Parsear payload
  let payload: GoToWebhookPayload;
  try {
    payload = JSON.parse(body ?? "{}");
  } catch {
    log.warn("GoTo webhook: payload com JSON inválido");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 5. Processar evento por tipo
  try {
    const eventType = payload.eventType;

    switch (eventType) {
      case "STARTING":
      case "ACTIVE":
      case "ENDING":
        await handleCallEvent(payload);
        break;
      case "REPORT_SUMMARY":
        await handleReportSummary(payload);
        break;
      default:
        log.debug("GoTo webhook: evento desconhecido ignorado", { eventType });
    }
  } catch (err) {
    // Nunca retornar 500 — GoTo pode reenviar e criar loops
    log.error("GoTo webhook: erro ao processar evento", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
