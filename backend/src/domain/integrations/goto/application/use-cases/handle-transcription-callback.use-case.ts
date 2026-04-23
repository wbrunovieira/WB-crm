import { Injectable, Logger } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";
import { PollCallTranscriptionsUseCase, PollCallTranscriptionsOutput } from "./poll-call-transcriptions.use-case";

export interface HandleTranscriptionCallbackInput {
  jobId: string;
  status: "done" | "failed";
  segments?: Array<{ start: number; end: number; text: string }>;
}

export type HandleTranscriptionCallbackOutput = PollCallTranscriptionsOutput;

@Injectable()
export class HandleTranscriptionCallbackUseCase {
  private readonly logger = new Logger(HandleTranscriptionCallbackUseCase.name);

  constructor(
    private readonly activitiesRepository: ActivitiesRepository,
    private readonly pollTranscriptions: PollCallTranscriptionsUseCase,
  ) {}

  async execute(
    input: HandleTranscriptionCallbackInput,
  ): Promise<Either<never, HandleTranscriptionCallbackOutput>> {
    const { jobId } = input;

    const activity = await this.activitiesRepository.findByTranscriptionJobId(jobId);
    if (!activity) {
      this.logger.debug("No activity found for transcription job", { jobId });
      return right({ skipped: true });
    }

    if (activity.gotoTranscriptText) {
      return right({ skipped: true });
    }

    this.logger.log("Transcription callback received, triggering poll", {
      jobId,
      activityId: activity.id.toString(),
      status: input.status,
    });

    return this.pollTranscriptions.execute({ activityId: activity.id.toString() });
  }
}
