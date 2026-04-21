import { Injectable, Logger } from "@nestjs/common";
import { right, type Either } from "@/core/either";
import { GoogleCalendarPort } from "../ports/google-calendar.port";
import { MeetingsRepository } from "../repositories/meetings.repository";

export interface RefreshMeetRsvpOutput {
  checked: number;
  updated: number;
}

@Injectable()
export class RefreshMeetRsvpUseCase {
  private readonly logger = new Logger(RefreshMeetRsvpUseCase.name);

  constructor(
    private readonly meetings: MeetingsRepository,
    private readonly calendar: GoogleCalendarPort,
  ) {}

  async execute(): Promise<Either<Error, RefreshMeetRsvpOutput>> {
    const scheduled = await this.meetings.findScheduledWithRsvpData();
    let updated = 0;

    for (const meeting of scheduled) {
      try {
        const event = await this.calendar.getMeetEvent(meeting.googleEventId);
        if (!event) continue;

        const fresh = event.attendees.map((a) => ({ email: a.email, status: a.responseStatus }));
        const freshJson = JSON.stringify(fresh);

        let currentJson: string;
        try {
          currentJson = JSON.stringify(JSON.parse(meeting.attendeeEmails || "[]"));
        } catch {
          currentJson = "[]";
        }

        if (currentJson !== freshJson) {
          await this.meetings.update(meeting.id, { attendeeEmails: fresh.map((a) => a.email) });
          updated++;
        }
      } catch (err) {
        this.logger.warn(`RSVP refresh failed for meeting ${meeting.id}: ${err}`);
      }
    }

    return right({ checked: scheduled.length, updated });
  }
}
