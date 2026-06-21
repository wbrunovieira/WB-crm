import { Injectable, Logger } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { Activity } from "@/domain/activities/enterprise/entities/activity";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";
import { TranscriberPort, TranscriptionSegment } from "@/infra/shared/transcriber/transcriber.port";

export interface PollCallTranscriptionsInput {
  activityId: string;
}

export interface TranscriptSegment extends TranscriptionSegment {
  speaker: "agent" | "client";
  speakerName: string;
}

/**
 * Reads the recording start time encoded in an S3 key filename
 * (`{yyyy}/{MM}/{dd}/{isoTimestamp}~{callId}~...mp3`) and returns the seconds
 * the client leg started after the agent leg. Used to realign a fallback
 * client-leg transcript onto the agent recording the player streams.
 */
function legOffsetSeconds(agentKey?: string, clientKey?: string): number {
  if (!agentKey || !clientKey) return 0;
  const iso = (k: string) => Date.parse((k.split("/").pop() ?? "").split("~")[0]);
  const ag = iso(agentKey);
  const cl = iso(clientKey);
  if (isNaN(ag) || isNaN(cl)) return 0;
  return (cl - ag) / 1000;
}

export interface PollCallTranscriptionsOutput {
  saved?: boolean;
  pending?: boolean;
  skipped?: boolean;
}

@Injectable()
export class PollCallTranscriptionsUseCase {
  private readonly logger = new Logger(PollCallTranscriptionsUseCase.name);

  constructor(
    private readonly activitiesRepository: ActivitiesRepository,
    private readonly transcriber: TranscriberPort,
  ) {}

  async execute(
    input: PollCallTranscriptionsInput,
  ): Promise<Either<never, PollCallTranscriptionsOutput>> {
    const { activityId } = input;

    const found = await this.activitiesRepository.findByIdForTranscription(activityId);
    if (!found) return right({ skipped: true });

    const { activity } = found;

    // Skip if already has transcript or no jobs
    if (activity.gotoTranscriptText) return right({ skipped: true });
    if (!activity.gotoTranscriptionJobId && !activity.gotoTranscriptionJobId2) {
      return right({ skipped: true });
    }

    const jobA = activity.gotoTranscriptionJobId;
    const jobB = activity.gotoTranscriptionJobId2;

    try {
      const statusA = jobA ? await this.transcriber.getStatus(jobA) : null;
      const statusB = jobB ? await this.transcriber.getStatus(jobB) : null;

      const aDone = !statusA || statusA.status === "done" || statusA.status === "failed";
      const bDone = !statusB || statusB.status === "done" || statusB.status === "failed";

      if (!aDone || !bDone) {
        return right({ pending: true });
      }

      // Fetch results for completed jobs
      const resultA = statusA?.status === "done" && jobA
        ? await this.transcriber.getResult(jobA)
        : null;
      const resultB = statusB?.status === "done" && jobB
        ? await this.transcriber.getResult(jobB)
        : null;

      // Each GoTo "leg" records the FULL duplex conversation (both voices), so
      // transcribing both legs and interleaving duplicated every line with the
      // wrong speaker. Emit a SINGLE stream from the agent leg — the audio the
      // player streams — falling back to the client leg only if the agent leg
      // produced nothing. The transcriber does not diarize, so we attach no
      // speaker attribution (single neutral stream).
      const segsAgent = resultA?.segments ?? [];
      const segsClient = resultB?.segments ?? [];
      const useAgentLeg = segsAgent.length > 0;
      const chosen = useAgentLeg ? segsAgent : segsClient;

      // When falling back to the client leg, realign its timeline onto the
      // agent recording so transcript highlights still match playback.
      const shift = useAgentLeg
        ? 0
        : legOffsetSeconds(activity.gotoRecordingUrl, activity.gotoRecordingUrl2);

      const segments: TranscriptSegment[] = chosen
        .map((s) => ({
          start: s.start + shift,
          end: s.end + shift,
          text: s.text,
          speaker: "agent" as const,
          speakerName: "",
        }))
        .sort((a, b) => a.start - b.start);

      const transcriptJson = JSON.stringify(segments);

      // Outcome detection still scans BOTH legs — voicemail / "invalid number"
      // prompts are often clearer on the far-end leg — even though only the
      // single stream is saved.
      const fullText = [...segsAgent, ...segsClient].map((s) => s.text).join(" ").toLowerCase();

      const isInvalidNumber =
        fullText.includes("número de telefone não existe") ||
        fullText.includes("número não existe") ||
        fullText.includes("fora de serviço") ||
        fullText.includes("número não está em serviço") ||
        fullText.includes("not in service") ||
        fullText.includes("not a working number");

      const isVoicemail =
        fullText.includes("encaminhada ao correio de voz") ||
        fullText.includes("caixa de mensagens") ||
        fullText.includes("grave a sua mensagem") ||
        fullText.includes("deixe uma mensagem após o sinal") ||
        fullText.includes("not available, please leave a message") ||
        fullText.includes("leave a message after the");

      let outcomeUpdate: { gotoCallOutcome?: string } = {};
      if (isInvalidNumber && (activity.gotoCallOutcome === "voicemail" || activity.gotoCallOutcome === "answered")) {
        outcomeUpdate = { gotoCallOutcome: "invalid_number" };
        this.logger.log("Auto-reclassified as invalid_number via transcript", { activityId });
      } else if (isVoicemail && activity.gotoCallOutcome === "answered") {
        outcomeUpdate = { gotoCallOutcome: "voicemail" };
        this.logger.log("Auto-reclassified as voicemail via transcript", { activityId });
      }

      activity.update({
        gotoTranscriptText: transcriptJson,
        gotoTranscriptionJobId: undefined,
        gotoTranscriptionJobId2: undefined,
        ...outcomeUpdate,
      });

      await this.activitiesRepository.save(activity);

      return right({ saved: true });
    } catch (err) {
      this.logger.error("Error polling transcription", {
        activityId,
        error: err instanceof Error ? err.message : String(err),
      });
      return right({ skipped: true });
    }
  }

  // Helper for batch polling
  static async findActivitiesWithPendingJobs(
    repo: ActivitiesRepository & { findManyWithPendingJobs?: () => Promise<Activity[]> },
  ): Promise<Activity[]> {
    if (repo.findManyWithPendingJobs) {
      return repo.findManyWithPendingJobs();
    }
    return [];
  }
}
