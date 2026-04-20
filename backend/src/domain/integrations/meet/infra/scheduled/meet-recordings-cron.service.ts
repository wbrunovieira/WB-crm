import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { DetectMeetRecordingsUseCase } from "../../application/use-cases/detect-meet-recordings.use-case";

@Injectable()
export class MeetRecordingsCronService {
  private readonly logger = new Logger(MeetRecordingsCronService.name);

  constructor(private readonly detectRecordings: DetectMeetRecordingsUseCase) {}

  @Cron("*/15 * * * *")
  async handleRecordings(): Promise<void> {
    this.logger.log("Meet recordings cron started");
    try {
      const result = await this.detectRecordings.execute();
      if (result.isRight()) {
        const { pass0DriveDetected, pass1TimeBased, retriedRecording } = result.value;
        this.logger.log(
          `Meet recordings cron done — pass0=${pass0DriveDetected} pass1=${pass1TimeBased} retry=${retriedRecording}`,
        );
      }
    } catch (err) {
      this.logger.error("Meet recordings cron error", err);
    }
  }
}
