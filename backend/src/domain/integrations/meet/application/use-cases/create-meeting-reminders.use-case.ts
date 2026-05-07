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
  reminderTypes?: ("morning_reminder" | "one_hour_reminder" | "on_time_reminder")[];
  channels?: ("email" | "whatsapp")[];
  recipientPhone?: string;
}

@Injectable()
export class CreateMeetingRemindersUseCase {
  constructor(private readonly repo: ScheduledEmailsRepository) {}

  async execute(input: CreateMeetingRemindersInput): Promise<Either<Error, void>> {
    const channels = input.channels ?? ["email"];
    const hasEmailChannel = channels.includes("email");
    const hasWhatsAppChannel = channels.includes("whatsapp");

    // Need at least one valid recipient
    if (!input.attendeeEmails.length && !(hasWhatsAppChannel && input.recipientPhone)) {
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

    // Determine which reminder types are active (skip logic still applies)
    const allowedTypes = input.reminderTypes;

    const shouldInclude = (type: "morning_reminder" | "one_hour_reminder" | "on_time_reminder"): boolean => {
      if (allowedTypes && !allowedTypes.includes(type)) return false;
      if (type === "morning_reminder") return morning > now && minutesUntilMorningEnd >= MIN_GAP_MORNING_MINUTES;
      if (type === "one_hour_reminder") return minutesUntilStart >= MIN_GAP_ONE_HOUR_MINUTES;
      if (type === "on_time_reminder") return input.startAt > now;
      return false;
    };

    const scheduledForByType: Record<string, Date> = {
      morning_reminder: morning,
      one_hour_reminder: oneHour,
      on_time_reminder: input.startAt,
    };

    const types: ("morning_reminder" | "one_hour_reminder" | "on_time_reminder")[] = [
      "morning_reminder",
      "one_hour_reminder",
      "on_time_reminder",
    ];

    for (const type of types) {
      if (!shouldInclude(type)) continue;
      const scheduledFor = scheduledForByType[type];

      if (hasEmailChannel && input.attendeeEmails.length > 0) {
        for (const email of input.attendeeEmails) {
          records.push({ ...base, type, scheduledFor, recipientEmail: email, channel: "email" });
        }
      }

      if (hasWhatsAppChannel && input.recipientPhone) {
        records.push({
          ...base,
          type,
          scheduledFor,
          recipientEmail: input.attendeeEmails[0] ?? "",
          channel: "whatsapp",
          recipientPhone: input.recipientPhone,
        });
      }
    }

    if (records.length > 0) {
      await this.repo.createMany(records);
    }
    return right(undefined);
  }
}
