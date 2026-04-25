import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { MeetingScheduledEvent } from "../../enterprise/events/meeting-scheduled.event";
import { CreateMeetingRemindersUseCase } from "../../application/use-cases/create-meeting-reminders.use-case";

@Injectable()
export class MeetingScheduledListener {
  private readonly logger = new Logger(MeetingScheduledListener.name);

  constructor(private readonly createReminders: CreateMeetingRemindersUseCase) {}

  @OnEvent("meeting.scheduled")
  async handle(event: MeetingScheduledEvent): Promise<void> {
    const { payload } = event;
    const result = await this.createReminders.execute({
      meetingId: payload.meetingId,
      title: payload.title,
      startAt: payload.startAt,
      endAt: payload.endAt,
      attendeeEmails: payload.attendeeEmails,
      organizerEmail: payload.organizerEmail,
      meetLink: payload.meetLink,
      description: payload.description,
      contactName: payload.contactName,
      companyName: payload.companyName,
    });

    if (result.isLeft()) {
      this.logger.warn(`Could not create reminders for meeting ${payload.meetingId}: ${result.value.message}`);
    } else {
      this.logger.log(`Reminders scheduled for meeting ${payload.meetingId}`);
    }
  }
}
