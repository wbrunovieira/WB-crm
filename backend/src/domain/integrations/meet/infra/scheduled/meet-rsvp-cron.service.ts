import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { RefreshMeetRsvpUseCase } from "../../application/use-cases/refresh-meet-rsvp.use-case";

@Injectable()
export class MeetRsvpCronService {
  private readonly logger = new Logger(MeetRsvpCronService.name);

  constructor(private readonly refreshRsvp: RefreshMeetRsvpUseCase) {}

  @Cron("*/5 * * * *")
  async handleRsvp(): Promise<void> {
    this.logger.log("Meet RSVP cron started");
    try {
      const result = await this.refreshRsvp.execute();
      if (result.isRight()) {
        const { checked, updated } = result.value;
        this.logger.log(`Meet RSVP cron done — checked=${checked} updated=${updated}`);
      }
    } catch (err) {
      this.logger.error("Meet RSVP cron error", err);
    }
  }
}
