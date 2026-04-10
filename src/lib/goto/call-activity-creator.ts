import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { matchPhoneToEntity } from "./number-matcher";
import type { GoToCallReport } from "./types";

const log = logger.child({ context: "call-activity-creator" });

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
  const external = report.participants.find((p) => p.type === "PHONE_NUMBER");
  return external?.phoneNumber ?? null;
}

function buildSubject(
  direction: "INBOUND" | "OUTBOUND",
  dialedNumber: string | null,
  durationSeconds: number
): string {
  const dir = direction === "OUTBOUND" ? "realizada" : "recebida";
  const duration = formatDuration(durationSeconds);
  const number = dialedNumber ?? "número desconhecido";
  return `Ligação ${dir} — ${number} (${duration})`;
}

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
    log.debug("Activity já existe para esta ligação, ignorando", {
      conversationSpaceId,
    });
    return;
  }

  // 2. Calcular duração
  const durationSeconds = calcDurationSeconds(callCreated, callEnded);
  const dialedNumber = getDialedNumber(report);

  // 3. Encontrar entidade pelo número discado
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
  const subject = buildSubject(direction, dialedNumber, durationSeconds);

  await prisma.activity.create({
    data: {
      type: "call",
      subject,
      description: `GoTo Call ID: ${conversationSpaceId}\nDireção: ${direction}\nDuração: ${formatDuration(durationSeconds)}`,
      completed: true,
      completedAt: new Date(callEnded),
      dueDate: new Date(callCreated),
      gotoCallId: conversationSpaceId,
      ownerId,
      // Vínculo com entidade encontrada
      contactId: matchResult?.contactId ?? null,
      leadId: matchResult?.leadId ?? null,
      partnerId: matchResult?.partnerId ?? null,
    },
  });

  log.info("Activity criada para ligação GoTo", {
    conversationSpaceId,
    direction,
    durationSeconds,
    entityType: matchResult?.entityType ?? "none",
    entityId: matchResult?.entityId,
  });
}
