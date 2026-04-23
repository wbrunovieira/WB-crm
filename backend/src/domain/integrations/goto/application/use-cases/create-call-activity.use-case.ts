import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";
import { Activity } from "@/domain/activities/enterprise/entities/activity";
import { CallOutcome } from "@/domain/integrations/goto/enterprise/value-objects/call-outcome.vo";
import { CallDuration } from "@/domain/integrations/goto/enterprise/value-objects/call-duration.vo";
import { GoToCallReport } from "@/domain/integrations/goto/application/ports/goto-api.port";
import type { IPhoneMatcherService } from "@/infra/shared/phone-matcher/phone-matcher.service";

export interface CreateCallActivityInput {
  report: GoToCallReport;
  ownerId: string;
}

export interface CreateCallActivityOutput {
  activityId: string;
  alreadyExists: boolean;
}

function calcDurationSeconds(callCreated: string, callEnded: string): number {
  const start = new Date(callCreated).getTime();
  const end = new Date(callEnded).getTime();
  return Math.max(0, Math.round((end - start) / 1000));
}

function getDialedNumber(report: GoToCallReport): string | null {
  const external = report.participants.find((p) => p.type.value === "PHONE_NUMBER");
  if (!external) return null;
  return external.type.callee?.number ?? external.type.number ?? null;
}

function getRecordingId(report: GoToCallReport): string | null {
  for (const participant of report.participants) {
    const rec = participant.recordings?.[0];
    if (rec?.id) return rec.id;
  }
  return null;
}

function buildSubject(
  direction: "INBOUND" | "OUTBOUND",
  dialedNumber: string | null,
  outcome: string,
  durationFormatted: string,
): string {
  const number = dialedNumber ?? "número desconhecido";
  switch (outcome) {
    case "answered":
      return direction === "OUTBOUND"
        ? `Ligação realizada — ${number} (${durationFormatted})`
        : `Ligação recebida — ${number} (${durationFormatted})`;
    case "voicemail":
      return `Caixa postal — ${number} (${durationFormatted})`;
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
        ? `Ligação realizada — ${number} (${durationFormatted})`
        : `Ligação recebida — ${number} (${durationFormatted})`;
  }
}

function buildDescription(
  conversationSpaceId: string,
  direction: "INBOUND" | "OUTBOUND",
  outcome: string,
  durationFormatted: string,
  durationSeconds: number,
  causeCode?: number,
): string {
  const outcomeLabels: Record<string, string> = {
    answered: "Atendida",
    voicemail: "Caixa postal",
    no_answer: "Não atendeu",
    busy: "Ocupado",
    rejected: "Rejeitada",
    invalid_number: "Número inválido",
    missed: "Chamada perdida",
    unknown: "Desconhecido",
  };

  const lines = [
    `GoTo Call ID: ${conversationSpaceId}`,
    `Direção: ${direction === "OUTBOUND" ? "Saída" : "Entrada"}`,
    `Resultado: ${outcomeLabels[outcome] ?? outcome}`,
  ];
  if (durationSeconds > 0) lines.push(`Duração: ${durationFormatted}`);
  if (causeCode !== undefined) lines.push(`Código Q.850: ${causeCode}`);
  if (outcome === "voicemail") {
    lines.push("Detectado automaticamente — duração curta sugere caixa postal");
  }
  return lines.join("\n");
}

@Injectable()
export class CreateCallActivityUseCase {
  constructor(
    private readonly activitiesRepository: ActivitiesRepository,
    private readonly phoneMatcher: IPhoneMatcherService,
  ) {}

  async execute(
    input: CreateCallActivityInput,
  ): Promise<Either<Error, CreateCallActivityOutput>> {
    const { report, ownerId } = input;
    const { conversationSpaceId, direction, callCreated, callEnded } = report;

    // 1. Idempotency check — find by gotoCallId
    const existing = await (this.activitiesRepository as ActivitiesRepository & {
      findFirst?: (where: { gotoCallId: string }) => Promise<Activity | null>;
    }).findFirst?.({ gotoCallId: conversationSpaceId });

    if (existing) {
      return right({ activityId: existing.id.toString(), alreadyExists: true });
    }

    // 2. Calculate duration
    const durationSeconds = calcDurationSeconds(callCreated, callEnded);

    // 3. Build CallOutcome VO
    const external = report.participants.find((p) => p.type.value === "PHONE_NUMBER");
    const causeCode = external?.causeCode;
    const outcomeResult = CallOutcome.fromCauseCode(causeCode, direction, durationSeconds);
    if (outcomeResult.isLeft()) return left(outcomeResult.value as Error);
    const outcome = outcomeResult.value;

    // 4. Build CallDuration VO
    const durationResult = CallDuration.create(durationSeconds);
    if (durationResult.isLeft()) return left(durationResult.value);
    const duration = durationResult.value;

    // 5. Recording only for answered calls
    const recordingId = outcome.isAnswered ? getRecordingId(report) : null;

    // 6. Phone matching
    const dialedNumber = getDialedNumber(report);
    let contactId: string | undefined;
    let leadId: string | undefined;
    let partnerId: string | undefined;

    if (dialedNumber) {
      try {
        const matchResult = await this.phoneMatcher.match(dialedNumber, ownerId);
        if (matchResult) {
          contactId = matchResult.contactId;
          leadId = matchResult.leadId;
          partnerId = matchResult.partnerId;
        }
      } catch {
        // Continue without entity link if phone matching fails
      }
    }

    // 7. Build subject and description
    const outcomeStr = outcome.toString();
    const durationFormatted = duration.format();
    const subject = buildSubject(direction, dialedNumber, outcomeStr, durationFormatted);
    const description = buildDescription(
      conversationSpaceId,
      direction,
      outcomeStr,
      durationFormatted,
      durationSeconds,
      causeCode,
    );

    // 8. Create Activity entity
    const activity = Activity.create({
      ownerId,
      type: "call",
      subject,
      description,
      completed: true,
      completedAt: new Date(callEnded),
      dueDate: new Date(callCreated),
      gotoCallId: conversationSpaceId,
      gotoRecordingId: recordingId ?? undefined,
      gotoCallOutcome: outcomeStr,
      gotoDuration: durationSeconds,
      callContactType: "gatekeeper",
      meetingNoShow: false,
      emailReplied: false,
      emailOpenCount: 0,
      emailLinkClickCount: 0,
      contactId,
      leadId,
      partnerId,
    });

    await this.activitiesRepository.save(activity);

    return right({ activityId: activity.id.toString(), alreadyExists: false });
  }
}
