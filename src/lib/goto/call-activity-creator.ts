import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { matchPhoneToEntity } from "./number-matcher";
import type { GoToCallReport } from "./types";

const log = logger.child({ context: "call-activity-creator" });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}min ${s}s`;
}

function calcDurationSeconds(callCreated: string, callEnded: string): number {
  const start = new Date(callCreated).getTime();
  const end = new Date(callEnded).getTime();
  return Math.max(0, Math.round((end - start) / 1000));
}

function getDialedNumber(report: GoToCallReport): string | null {
  const external = report.participants.find((p) => p.type.value === "PHONE_NUMBER");
  if (!external) return null;
  // OUTBOUND: callee.number é o número externo discado
  // INBOUND: number é o número do chamador externo
  return external.type.callee?.number ?? external.type.number ?? null;
}

function getRecordingId(report: GoToCallReport): string | null {
  for (const participant of report.participants) {
    const rec = participant.recordings?.[0];
    if (rec?.id) return rec.id;
  }
  return null;
}

// ─── Call outcome ─────────────────────────────────────────────────────────────

/**
 * Possible outcomes of a GoTo call, derived from ISDN Q.850 cause codes
 * and call direction/duration.
 *
 * ISDN Q.850 codes used:
 *   1  — Unallocated/invalid number
 *   16 — Normal call clearing (answered)
 *   17 — User busy
 *   18 — No user responding (ring timeout, no answer)
 *   19 — No answer from user (user alerted but did not answer)
 *   21 — Call rejected (user declined / blocked)
 *
 * Voicemail: no dedicated cause code — carrier/PBX voicemail answers the call
 * normally (code 16). We detect it heuristically: OUTBOUND + answered +
 * duration < VOICEMAIL_THRESHOLD_S.
 */
type CallOutcome =
  | "answered"          // atendida
  | "voicemail"         // possível caixa postal (curta + atendida)
  | "no_answer"         // não atendeu (tocou e desligou/timeout)
  | "busy"              // ocupado
  | "rejected"          // rejeitou / bloqueou
  | "invalid_number"    // número inválido / inexistente
  | "missed"            // chamada perdida (inbound não atendida por nós)
  | "unknown";          // código desconhecido

const VOICEMAIL_THRESHOLD_S = 15; // segundos — abaixo disso, provavelmente caixa postal

function getCallOutcome(report: GoToCallReport, durationSeconds: number): CallOutcome {
  const external = report.participants.find((p) => p.type.value === "PHONE_NUMBER");
  const causeCode = external?.causeCode;

  if (report.direction === "INBOUND") {
    // Para ligações recebidas: se duração = 0 → não atendemos (chamada perdida)
    if (durationSeconds === 0) return "missed";
    return "answered";
  }

  // Outbound — usa causeCode do participante externo
  switch (causeCode) {
    case 16:
      // Atendida — mas pode ser caixa postal se muito curta
      if (durationSeconds < VOICEMAIL_THRESHOLD_S) return "voicemail";
      return "answered";
    case 17:
      return "busy";
    case 18:
    case 19:
      return "no_answer";
    case 21:
      return "rejected";
    case 1:
      return "invalid_number";
    default:
      // Sem causeCode: usa duração como fallback
      if (durationSeconds > 0) return "answered";
      return "unknown";
  }
}

// ─── Subject builder ──────────────────────────────────────────────────────────

function buildSubject(
  direction: "INBOUND" | "OUTBOUND",
  dialedNumber: string | null,
  outcome: CallOutcome,
  durationSeconds: number
): string {
  const number = dialedNumber ?? "número desconhecido";
  const duration = formatDuration(durationSeconds);

  switch (outcome) {
    case "answered":
      return direction === "OUTBOUND"
        ? `Ligação realizada — ${number} (${duration})`
        : `Ligação recebida — ${number} (${duration})`;
    case "voicemail":
      return `Caixa postal — ${number} (${duration})`;
    case "no_answer":
      return `Não atendeu — ${number}`;
    case "busy":
      return `Ocupado — ${number}`;
    case "rejected":
      return `Ligação rejeitada — ${number}`;
    case "invalid_number":
      return `Número inválido — ${number}`;
    case "missed":
      return `Chamada perdida — ${number}`;
    default:
      return direction === "OUTBOUND"
        ? `Ligação realizada — ${number} (${duration})`
        : `Ligação recebida — ${number} (${duration})`;
  }
}

function buildDescription(
  conversationSpaceId: string,
  direction: "INBOUND" | "OUTBOUND",
  outcome: CallOutcome,
  durationSeconds: number,
  causeCode?: number
): string {
  const lines = [
    `GoTo Call ID: ${conversationSpaceId}`,
    `Direção: ${direction === "OUTBOUND" ? "Saída" : "Entrada"}`,
    `Resultado: ${outcomeLabel(outcome)}`,
  ];
  if (durationSeconds > 0) lines.push(`Duração: ${formatDuration(durationSeconds)}`);
  if (causeCode !== undefined) lines.push(`Código Q.850: ${causeCode}`);
  if (outcome === "voicemail") {
    lines.push("⚠️ Detectado automaticamente — duração curta sugere caixa postal");
  }
  return lines.join("\n");
}

function outcomeLabel(outcome: CallOutcome): string {
  switch (outcome) {
    case "answered":       return "Atendida";
    case "voicemail":      return "Caixa postal";
    case "no_answer":      return "Não atendeu";
    case "busy":           return "Ocupado";
    case "rejected":       return "Rejeitada";
    case "invalid_number": return "Número inválido";
    case "missed":         return "Chamada perdida";
    default:               return "Desconhecido";
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function createCallActivity(
  report: GoToCallReport,
  ownerId: string
): Promise<void> {
  const { conversationSpaceId, direction, callCreated, callEnded } = report;

  // 1. Idempotência — não criar Activity duplicada
  const existing = await prisma.activity.findFirst({
    where: { gotoCallId: conversationSpaceId },
    select: { id: true },
  });
  if (existing) {
    log.debug("Activity já existe para esta ligação, ignorando", { conversationSpaceId });
    return;
  }

  // 2. Duração, outcome e número
  const durationSeconds = calcDurationSeconds(callCreated, callEnded);
  const dialedNumber = getDialedNumber(report);
  const outcome = getCallOutcome(report, durationSeconds);

  // Gravação só existe se a ligação foi atendida
  const recordingId = outcome === "answered" ? getRecordingId(report) : null;

  // causeCode do participante externo (para log e descrição)
  const external = report.participants.find((p) => p.type.value === "PHONE_NUMBER");
  const causeCode = external?.causeCode;

  // 3. Encontrar entidade pelo número
  let matchResult = null;
  if (dialedNumber) {
    try {
      matchResult = await matchPhoneToEntity(dialedNumber, ownerId);
    } catch (err) {
      log.warn("Falha ao buscar entidade pelo número, continuando sem vínculo", {
        dialedNumber,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 4. Criar Activity
  const subject = buildSubject(direction, dialedNumber, outcome, durationSeconds);
  const description = buildDescription(conversationSpaceId, direction, outcome, durationSeconds, causeCode);

  await prisma.activity.create({
    data: {
      type: "call",
      subject,
      description,
      completed: true,
      completedAt: new Date(callEnded),
      dueDate: new Date(callCreated),
      gotoCallId: conversationSpaceId,
      gotoRecordingId: recordingId,
      gotoCallOutcome: outcome,
      ownerId,
      contactId: matchResult?.contactId ?? null,
      leadId: matchResult?.leadId ?? null,
      partnerId: matchResult?.partnerId ?? null,
    },
  });

  log.info("Activity criada para ligação GoTo", {
    conversationSpaceId,
    direction,
    outcome,
    durationSeconds,
    causeCode,
    hasRecording: !!recordingId,
    entityType: matchResult?.entityType ?? "none",
  });
}
