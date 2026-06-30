import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SendDueScheduledEmailsUseCase } from "../../application/use-cases/send-due-scheduled-emails.use-case";

@Injectable()
export class ScheduledEmailsCronService {
  private readonly logger = new Logger(ScheduledEmailsCronService.name);
  private running = false;

  constructor(private readonly sendDue: SendDueScheduledEmailsUseCase) {}

  @Cron("* * * * *") // every minute — scheduling granularity is the minute
  async run(): Promise<void> {
    if (this.running) {
      // Avoid overlapping runs if a previous batch is still sending.
      return;
    }
    this.running = true;
    try {
      const result = await this.sendDue.execute(new Date());
      if (result.isLeft()) {
        this.logger.error(`Scheduled emails cron failed: ${result.value.message}`);
      }
    } catch (err) {
      this.logger.error("Scheduled emails cron: fatal error", {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      this.running = false;
    }
  }
}
