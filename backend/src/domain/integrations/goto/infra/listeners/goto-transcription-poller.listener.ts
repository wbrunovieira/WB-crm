import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PollCallTranscriptionsUseCase } from "@/domain/integrations/goto/application/use-cases/poll-call-transcriptions.use-case";
import { GotoTranscriptionSubmittedEvent } from "@/domain/integrations/goto/enterprise/events/goto-transcription-submitted.event";

@Injectable()
export class GotoTranscriptionPollerListener {
  private readonly logger = new Logger(GotoTranscriptionPollerListener.name);

  constructor(
    private readonly pollTranscriptions: PollCallTranscriptionsUseCase,
    private readonly pollIntervalMs: number = 60 * 1000,
    private readonly maxAttempts: number = 30,
  ) {}

  @OnEvent("goto.transcription.submitted")
  async handle(event: GotoTranscriptionSubmittedEvent): Promise<void> {
    const { activityId } = event;

    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      try {
        const result = await this.pollTranscriptions.execute({ activityId });

        if (result.isRight() && result.value.saved) {
          this.logger.log(`Transcription saved for activity ${activityId}`);
          return;
        }

        if (result.isRight() && result.value.skipped) {
          return;
        }

        // still pending — wait before next attempt
        if (attempt < this.maxAttempts - 1 && this.pollIntervalMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
        }
      } catch (err) {
        this.logger.error("Error polling transcription", {
          activityId,
          attempt,
          error: err instanceof Error ? err.message : String(err),
        });
        return;
      }
    }

    this.logger.warn(`Max polling attempts (${this.maxAttempts}) reached for activity ${activityId}`);
  }
}
