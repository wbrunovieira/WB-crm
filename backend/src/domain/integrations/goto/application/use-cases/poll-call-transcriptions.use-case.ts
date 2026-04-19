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

    const activity = await this.activitiesRepository.findByIdRaw(activityId);
    if (!activity) return right({ skipped: true });

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

      // Build interleaved segments
      const segmentsAgent: TranscriptSegment[] = (resultA?.segments ?? []).map((s) => ({
        ...s,
        speaker: "agent",
        speakerName: "Agente",
      }));
      const segmentsClient: TranscriptSegment[] = (resultB?.segments ?? []).map((s) => ({
        ...s,
        speaker: "client",
        speakerName: "Cliente",
      }));

      const interleaved = [...segmentsAgent, ...segmentsClient].sort(
        (a, b) => a.start - b.start,
      );

      const transcriptJson = JSON.stringify(interleaved);

      activity.update({
        gotoTranscriptText: transcriptJson,
        gotoTranscriptionJobId: undefined,
        gotoTranscriptionJobId2: undefined,
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
