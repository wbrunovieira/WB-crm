import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { MeetingCancelledEvent } from "../../enterprise/events/meeting-cancelled.event";
import { CancelMeetingRemindersUseCase } from "../../application/use-cases/cancel-meeting-reminders.use-case";

@Injectable()
export class MeetingCancelledListener {
  private readonly logger = new Logger(MeetingCancelledListener.name);

  constructor(private readonly cancelReminders: CancelMeetingRemindersUseCase) {}

  @OnEvent("meeting.cancelled")
  async handle(event: MeetingCancelledEvent): Promise<void> {
    await this.cancelReminders.execute(event.meetingId);
    this.logger.log(`Reminders cancelled for meeting ${event.meetingId}`);
  }
}
