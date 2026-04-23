import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ProcessCallRecordingUseCase } from "@/domain/integrations/goto/application/use-cases/process-call-recording.use-case";
import { GotoActivityCreatedEvent } from "@/domain/integrations/goto/enterprise/events/goto-activity-created.event";
import { GotoTranscriptionSubmittedEvent } from "@/domain/integrations/goto/enterprise/events/goto-transcription-submitted.event";

@Injectable()
export class GotoActivityCreatedListener {
  private readonly logger = new Logger(GotoActivityCreatedListener.name);

  constructor(
    private readonly processRecording: ProcessCallRecordingUseCase,
    private readonly eventEmitter: EventEmitter2,
    private readonly delayMs: number = 2 * 60 * 1000,
  ) {}

  @OnEvent("goto.activity.created")
  async handle(event: GotoActivityCreatedEvent): Promise<void> {
    const { activityId } = event;

    try {
      if (this.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.delayMs));
      }

      const result = await this.processRecording.execute({ activityId });

      if (result.isRight() && result.value.submitted) {
        this.eventEmitter.emit(
          "goto.transcription.submitted",
          new GotoTranscriptionSubmittedEvent(activityId),
        );
      } else if (result.isRight() && result.value.notFound) {
        this.logger.warn("Recording not found in S3 after delay — cron will retry", { activityId });
      }
    } catch (err) {
      this.logger.error("Error in GotoActivityCreatedListener", {
        activityId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
