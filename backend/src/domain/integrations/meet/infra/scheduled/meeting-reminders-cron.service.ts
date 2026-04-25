import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SendScheduledEmailsUseCase } from "../../application/use-cases/send-scheduled-emails.use-case";

@Injectable()
export class MeetingRemindersCronService {
  private readonly logger = new Logger(MeetingRemindersCronService.name);

  constructor(private readonly sendEmails: SendScheduledEmailsUseCase) {}

  @Cron("* * * * *") // every minute — only processes actually due records
  async run(): Promise<void> {
    const result = await this.sendEmails.execute();
    if (result.isRight() && (result.value.sent > 0 || result.value.failed > 0)) {
      this.logger.log(`Reminders: ${result.value.sent} sent, ${result.value.failed} failed`);
    }
  }
}
