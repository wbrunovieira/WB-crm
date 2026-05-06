import { Injectable, Logger } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { GoToApiPort, GoToCallHistoryItem, GoToCallReport } from "../ports/goto-api.port";
import { GoToTokenPort } from "../ports/goto-token.port";
import { CreateCallActivityUseCase } from "./create-call-activity.use-case";
import { CallOutcome } from "../../enterprise/value-objects/call-outcome.vo";

export interface SyncGotoCallReportsInput {
  ownerId: string;
  sinceDaysAgo?: number;
}

export interface SyncGotoCallReportsOutput {
  fetched: number;
  created: number;
  skipped: number;
}

interface EventEmitter {
  emit(event: string, payload: unknown): void;
}

function isInternalExtension(number: string | undefined): boolean {
  if (!number) return false;
  return number.replace(/\D/g, "").length <= 4;
}

function historyItemToReport(item: GoToCallHistoryItem): GoToCallReport {
  const durationMs = item.duration ?? 0;
  const startMs = new Date(item.startTime).getTime();
  const callEnded = new Date(startMs + durationMs).toISOString();

  // GoTo softphone outbound calls appear as INBOUND from an internal extension (e.g. "1001").
  // The real external number is in callee.number; treat these as OUTBOUND.
  const isBridgedOutbound =
    item.direction === "INBOUND" && isInternalExtension(item.caller?.number);

  const effectiveDirection: "INBOUND" | "OUTBOUND" = isBridgedOutbound ? "OUTBOUND" : item.direction;
  const externalNumber = isBridgedOutbound
    ? item.callee?.number
    : item.direction === "OUTBOUND"
      ? item.callee?.number
      : item.caller?.number;

  return {
    conversationSpaceId: item.originatorId,
    accountKey: "",
    direction: effectiveDirection,
    callCreated: item.startTime,
    callEnded,
    participants: [
      {
        id: item.legId,
        legId: item.legId,
        causeCode: item.hangupCause,
        type: {
          value: "PHONE_NUMBER",
          number: externalNumber,
          callee: effectiveDirection === "OUTBOUND" ? (item.callee ?? item.caller) : undefined,
        },
        recordings: [],
      },
    ],
    _historyItem: item,
  } as GoToCallReport & { _historyItem: GoToCallHistoryItem };
}

function deduplicateByOriginatorId(items: GoToCallHistoryItem[]): GoToCallHistoryItem[] {
  const seen = new Map<string, GoToCallHistoryItem>();
  for (const item of items) {
    const existing = seen.get(item.originatorId);
    if (!existing || (item.direction === "OUTBOUND" && existing.direction !== "OUTBOUND")) {
      seen.set(item.originatorId, item);
    }
  }
  return Array.from(seen.values());
}

@Injectable()
export class SyncGotoCallReportsUseCase {
  private readonly logger = new Logger(SyncGotoCallReportsUseCase.name);

  constructor(
    private readonly goToApi: GoToApiPort,
    private readonly goToToken: GoToTokenPort,
    private readonly createCallActivity: CreateCallActivityUseCase,
    private readonly eventEmitter: EventEmitter,
  ) {}

  async execute(input: SyncGotoCallReportsInput): Promise<Either<never, SyncGotoCallReportsOutput>> {
    const { ownerId, sinceDaysAgo = 1 } = input;

    const accessToken = await this.goToToken.getValidAccessToken();
    const since = new Date(Date.now() - sinceDaysAgo * 24 * 60 * 60 * 1000).toISOString();

    this.logger.log("Syncing GoTo call reports", { since, ownerId });

    const historyItems = await this.goToApi.fetchCallHistorySince(accessToken, since);
    const dedupedItems = deduplicateByOriginatorId(historyItems);

    let created = 0;
    let skipped = 0;

    for (const item of dedupedItems) {
      try {
        const report = historyItemToReport(item);
        const outcomeResult = CallOutcome.fromCallHistory(
          item.hangupCause,
          report.direction, // use effective direction (bridged outbound → OUTBOUND)
          item.duration,
          item.answerTime,
        );
        if (outcomeResult.isLeft()) { skipped++; continue; }

        const result = await this.createCallActivity.execute({
          report,
          ownerId,
          callHistoryOutcome: outcomeResult.value,
        });
        if (result.isRight()) {
          if (result.value.alreadyExists) {
            skipped++;
          } else {
            created++;
            this.eventEmitter.emit("goto.activity.created", { activityId: result.value.activityId });
          }
        } else {
          skipped++;
        }
      } catch {
        skipped++;
      }
    }

    this.logger.log("GoTo sync done", { fetched: historyItems.length, created, skipped });
    return right({ fetched: historyItems.length, created, skipped });
  }
}
