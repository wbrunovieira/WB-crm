import { Injectable, Logger } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";
import { S3StoragePort } from "@/domain/integrations/goto/application/ports/s3-storage.port";
import { TranscriberPort } from "@/infra/shared/transcriber/transcriber.port";

export interface ProcessCallRecordingInput {
  activityId: string;
}

export interface ProcessCallRecordingOutput {
  submitted?: boolean;
  notFound?: boolean;
  skipped?: boolean;
}

@Injectable()
export class ProcessCallRecordingUseCase {
  private readonly logger = new Logger(ProcessCallRecordingUseCase.name);

  constructor(
    private readonly activitiesRepository: ActivitiesRepository,
    private readonly s3Storage: S3StoragePort,
    private readonly transcriber: TranscriberPort,
  ) {}

  async execute(
    input: ProcessCallRecordingInput,
  ): Promise<Either<never, ProcessCallRecordingOutput>> {
    const { activityId } = input;

    // 1. Find activity
    const activity = await this.activitiesRepository.findByIdRaw(activityId);
    if (!activity) {
      return right({ notFound: true });
    }

    // 2. Skip if no recording ID
    if (!activity.gotoRecordingId) {
      return right({ skipped: true });
    }

    // 3. Skip if already processed
    if (activity.gotoRecordingUrl) {
      return right({ skipped: true });
    }

    const callDate = activity.completedAt ?? new Date();

    try {
      // 4. Find agent S3 key
      const agentKey = await this.s3Storage.findRecordingKey(activity.gotoRecordingId, callDate);
      if (!agentKey) {
        this.logger.debug("Agent recording key not found in S3 yet", { activityId });
        return right({ notFound: true });
      }

      // 5. Find client sibling key
      const siblingResult = await this.s3Storage.findSiblingKey(agentKey);
      const clientKey = siblingResult?.key ?? null;

      // 6. Download and submit agent track
      const agentBuffer = await this.s3Storage.download(agentKey);
      const { jobId: jobAgent } = await this.transcriber.submitAudio(
        agentBuffer,
        `ligacao-${activityId}-agent.mp3`,
      );

      // 7. Download and submit client track if available
      let jobClient: string | null = null;
      if (clientKey) {
        const clientBuffer = await this.s3Storage.download(clientKey);
        const { jobId } = await this.transcriber.submitAudio(
          clientBuffer,
          `ligacao-${activityId}-client.mp3`,
        );
        jobClient = jobId;
      }

      // 8. Update activity with S3 keys and job IDs
      activity.update({
        gotoRecordingUrl: agentKey,
        gotoRecordingUrl2: clientKey ?? undefined,
        gotoTranscriptionJobId: jobAgent,
        gotoTranscriptionJobId2: jobClient ?? undefined,
      });

      await this.activitiesRepository.save(activity);

      return right({ submitted: true });
    } catch (err) {
      this.logger.error("Error processing call recording", {
        activityId,
        error: err instanceof Error ? err.message : String(err),
      });
      return right({ notFound: true });
    }
  }
}
