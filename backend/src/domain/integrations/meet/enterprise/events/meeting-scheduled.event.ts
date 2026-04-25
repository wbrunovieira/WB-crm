export class MeetingScheduledEvent {
  constructor(public readonly payload: {
    meetingId: string;
    title: string;
    startAt: Date;
    endAt?: Date;
    attendeeEmails: string[];
    organizerEmail?: string;
    meetLink?: string;
    description?: string;
    contactName?: string;
    companyName?: string;
  }) {}
}
