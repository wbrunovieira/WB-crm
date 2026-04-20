import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PollMeetTranscriptionsUseCase } from "../../application/use-cases/poll-meet-transcriptions.use-case";

@Injectable()
export class MeetTranscriptionsCronService {
  private readonly logger = new Logger(MeetTranscriptionsCronService.name);

  constructor(private readonly pollTranscriptions: PollMeetTranscriptionsUseCase) {}

  @Cron("*/5 * * * *")
  async handleTranscriptions(): Promise<void> {
    this.logger.log("Meet transcriptions cron started");
    try {
      const result = await this.pollTranscriptions.execute();
      if (result.isRight()) {
        const { polled, results } = result.value;
        const done = results.filter((r) => r.action === "transcription_saved").length;
        this.logger.log(`Meet transcriptions cron done — polled=${polled} saved=${done}`);
      }
    } catch (err) {
      this.logger.error("Meet transcriptions cron error", err);
    }
  }
}
