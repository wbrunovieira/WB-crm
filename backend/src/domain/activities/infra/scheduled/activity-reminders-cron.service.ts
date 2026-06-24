import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { ProcessActivityRemindersUseCase } from "../../application/use-cases/process-activity-reminders.use-case";

/**
 * Fires "notificar-me" reminders every minute. The use case only touches
 * activities that are actually due (remindAt <= now, not yet reminded), so this
 * is cheap to run frequently and gives ~1-minute precision on the chosen time.
 */
@Injectable()
export class ActivityRemindersCronService {
  private readonly logger = new Logger(ActivityRemindersCronService.name);

  constructor(private readonly process: ProcessActivityRemindersUseCase) {}

  @Cron("* * * * *")
  async run(): Promise<void> {
    const result = await this.process.execute();
    if (result.isRight() && result.value.reminded > 0) {
      this.logger.log(`Activity reminders: ${result.value.reminded} notification(s) created`);
    }
  }
}
