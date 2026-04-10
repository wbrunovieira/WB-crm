import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createCallActivity } from "@/lib/goto/call-activity-creator";
import type { GoToCallReport, GoToWebhookPayload } from "@/lib/goto/types";

const log = logger.child({ context: "goto-webhook" });

const GOTO_API = "https://api.goto.com";

function validateSecret(req: NextRequest): boolean {
  const expectedSecret = process.env.GOTO_WEBHOOK_SECRET;
  if (!expectedSecret) return false;
  const url = new URL(req.url);
  return url.searchParams.get("secret") === expectedSecret;
}

function isGotoPing(body: string | null, req: NextRequest): boolean {
  const userAgent = req.headers.get("user-agent") ?? "";
  return userAgent.includes("GoTo Notifications") && (!body || body.trim() === "");
}

async function fetchCallReport(
  conversationSpaceId: string,
  accessToken: string
): Promise<GoToCallReport | null> {
  try {
    const res = await fetch(
      `${GOTO_API}/call-events-report/v1/reports/${conversationSpaceId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) {
      log.warn("Falha ao buscar relatório GoTo", {
        conversationSpaceId,
        status: res.status,
      });
      return null;
    }
    return res.json();
  } catch (err) {
    log.error("Erro ao buscar relatório GoTo", {
      conversationSpaceId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

async function handleCallEvent(payload: GoToWebhookPayload): Promise<void> {
  const { callEvent } = payload;
  if (!callEvent) return;

  log.info("GoTo call event received", {
    conversationSpaceId: callEvent.metadata.conversationSpaceId,
    direction: callEvent.metadata.direction,
    eventType: callEvent.state.type,
  });
  // Fase 5 irá processar ENDING para retry engine
}

async function handleReportSummary(payload: GoToWebhookPayload): Promise<void> {
  const { reportSummary } = payload;
  if (!reportSummary) return;

  const { conversationSpaceId } = reportSummary;

  log.info("GoTo report summary received", { conversationSpaceId });

  // Buscar access token armazenado
  // Fase 4 irá persistir o token no banco; por ora usa env var de fallback
  const accessToken = process.env.GOTO_ACCESS_TOKEN;
  if (!accessToken) {
    log.warn("GOTO_ACCESS_TOKEN não configurado — ignorando relatório", {
      conversationSpaceId,
    });
    return;
  }

  // Buscar relatório completo com participants e causeCode
  const report = await fetchCallReport(conversationSpaceId, accessToken);
  if (!report) return;

  // Determinar ownerId a partir do lineId do participante LINE
  // Fase 4 irá mapear lineId → userId; por ora usa o admin do account
  const ownerId = process.env.GOTO_DEFAULT_OWNER_ID;
  if (!ownerId) {
    log.warn("GOTO_DEFAULT_OWNER_ID não configurado — ignorando relatório", {
      conversationSpaceId,
    });
    return;
  }

  await createCallActivity(report, ownerId);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!validateSecret(req)) {
    log.warn("GoTo webhook: secret inválido ou ausente");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: string | null = null;
  try {
    body = await req.text();
  } catch {
    // body vazio é válido (ping)
  }

  if (isGotoPing(body, req)) {
    log.info("GoTo webhook: ping de verificação respondido");
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  let payload: GoToWebhookPayload;
  try {
    payload = JSON.parse(body ?? "{}");
  } catch {
    log.warn("GoTo webhook: payload com JSON inválido");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    switch (payload.eventType) {
      case "STARTING":
      case "ACTIVE":
      case "ENDING":
        await handleCallEvent(payload);
        break;
      case "REPORT_SUMMARY":
        await handleReportSummary(payload);
        break;
      default:
        log.debug("GoTo webhook: evento ignorado", { eventType: payload.eventType });
    }
  } catch (err) {
    // Nunca retornar 500 — GoTo poderia reenviar e criar loops
    log.error("GoTo webhook: erro ao processar evento", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
