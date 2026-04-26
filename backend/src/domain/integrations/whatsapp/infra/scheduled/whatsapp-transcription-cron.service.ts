import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PollWhatsAppTranscriptionsUseCase } from "@/domain/integrations/whatsapp/application/use-cases/poll-whatsapp-transcriptions.use-case";

@Injectable()
export class WhatsAppTranscriptionCronService {
  private readonly logger = new Logger(WhatsAppTranscriptionCronService.name);

  constructor(
    private readonly pollTranscriptions: PollWhatsAppTranscriptionsUseCase,
  ) {}

  @Cron("*/30 * * * *")
  async pollPendingTranscriptions(): Promise<void> {
    this.logger.log("WhatsApp transcription cron: starting");

    try {
      const result = await this.pollTranscriptions.execute();
      if (result.isRight()) {
        const { polled, saved, failed } = result.value;
        this.logger.log(`WhatsApp transcription cron: polled=${polled}, saved=${saved}, failed=${failed}`);
      }
    } catch (err) {
      this.logger.error("WhatsApp transcription cron: fatal error", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    this.logger.log("WhatsApp transcription cron: done");
  }
}
