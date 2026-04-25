export interface ScheduledEmailRecord {
  id: string;
  meetingId: string;
  type: "morning_reminder" | "one_hour_reminder" | "on_time_reminder";
  scheduledFor: Date;
  status: "pending" | "sent" | "cancelled" | "failed";
  attempts: number;
  sentAt: Date | null;
  failReason: string | null;
  recipientEmail: string;
  organizerEmail: string | null;
  meetingTitle: string;
  meetingStartAt: Date;
  meetingEndAt: Date | null;
  meetingDescription: string | null;
  meetLink: string | null;
  contactName: string | null;
  companyName: string | null;
  createdAt: Date;
}

export interface CreateScheduledEmailInput {
  meetingId: string;
  type: "morning_reminder" | "one_hour_reminder" | "on_time_reminder";
  scheduledFor: Date;
  recipientEmail: string;
  organizerEmail?: string;
  meetingTitle: string;
  meetingStartAt: Date;
  meetingEndAt?: Date;
  meetingDescription?: string;
  meetLink?: string;
  contactName?: string;
  companyName?: string;
}

export abstract class ScheduledEmailsRepository {
  abstract createMany(items: CreateScheduledEmailInput[]): Promise<void>;
  abstract findDue(now: Date, limit?: number): Promise<ScheduledEmailRecord[]>;
  abstract markSent(id: string): Promise<void>;
  abstract markFailed(id: string, reason: string): Promise<void>;
  abstract cancelByMeetingId(meetingId: string): Promise<void>;
}
