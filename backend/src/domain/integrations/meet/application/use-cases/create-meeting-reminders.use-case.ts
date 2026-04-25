import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import {
  ScheduledEmailsRepository,
  CreateScheduledEmailInput,
} from "../repositories/scheduled-emails.repository";

const TZ = "America/Sao_Paulo";
const MORNING_HOUR = 8;
const MIN_GAP_MORNING_MINUTES = 90; // skip morning if meeting starts within 90min of 08:00
const MIN_GAP_ONE_HOUR_MINUTES = 62; // skip 1h reminder if meeting is less than 62min away

function toSaoPaulo(date: Date): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)!.value, 10);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute") };
}

function morningOf(startAt: Date): Date {
  const sp = toSaoPaulo(startAt);
  // Build 08:00 SP on the same calendar day
  const utcOffset = -3 * 60 * 60 * 1000; // UTC-3 fixed (SP non-DST)
  const midnight = Date.UTC(sp.year, sp.month - 1, sp.day, 0, 0, 0, 0);
  return new Date(midnight - utcOffset + MORNING_HOUR * 60 * 60 * 1000);
}

export interface CreateMeetingRemindersInput {
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
}

@Injectable()
export class CreateMeetingRemindersUseCase {
  constructor(private readonly repo: ScheduledEmailsRepository) {}

  async execute(input: CreateMeetingRemindersInput): Promise<Either<Error, void>> {
    if (!input.attendeeEmails.length) {
      return left(new Error("No attendee emails provided"));
    }

    const now = new Date();
    const records: CreateScheduledEmailInput[] = [];
    const base = {
      meetingId: input.meetingId,
      meetingTitle: input.title,
      meetingStartAt: input.startAt,
      meetingEndAt: input.endAt,
      meetingDescription: input.description,
      meetLink: input.meetLink,
      organizerEmail: input.organizerEmail,
      contactName: input.contactName,
      companyName: input.companyName,
    };

    const morning = morningOf(input.startAt);
    const oneHour = new Date(input.startAt.getTime() - 60 * 60 * 1000);
    const minutesUntilMorningEnd = (input.startAt.getTime() - morning.getTime()) / 60_000;
    const minutesUntilStart = (input.startAt.getTime() - now.getTime()) / 60_000;

    for (const email of input.attendeeEmails) {
      // Morning: only if meeting starts > 90min after 08:00 and 08:00 is in the future
      if (morning > now && minutesUntilMorningEnd >= MIN_GAP_MORNING_MINUTES) {
        records.push({ ...base, type: "morning_reminder", scheduledFor: morning, recipientEmail: email });
      }

      // 1h before: only if meeting is more than 62min away
      if (minutesUntilStart >= MIN_GAP_ONE_HOUR_MINUTES) {
        records.push({ ...base, type: "one_hour_reminder", scheduledFor: oneHour, recipientEmail: email });
      }

      // On-time: always (as long as not in the past)
      if (input.startAt > now) {
        records.push({ ...base, type: "on_time_reminder", scheduledFor: input.startAt, recipientEmail: email });
      }
    }

    await this.repo.createMany(records);
    return right(undefined);
  }
}
