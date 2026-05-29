import { Injectable, Logger, Optional, Inject } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Either, left, right } from "@/core/either";
import { MeetingsRepository, MeetingRecord } from "../repositories/meetings.repository";
import { EvolutionApiPort } from "@/domain/integrations/whatsapp/application/ports/evolution-api.port";
import { GmailPort } from "@/domain/integrations/email/application/ports/gmail.port";
import { GoogleCalendarPort } from "../ports/google-calendar.port";
import { MeetingScheduledEvent } from "../../enterprise/events/meeting-scheduled.event";
import { getBrandConfig, buildBrandedEmail } from "../helpers/brand-email.helper";

export interface SchedulePresentialMeetingInput {
  title: string;
  startAt: Date;
  endAt?: Date;
  attendeeEmails: string[];
  requesterId: string;
  isPresential: true;
  location?: string;
  confirmationMethod?: "email" | "whatsapp" | "none";
  confirmationPhone?: string;
  leadId?: string;
  contactId?: string;
  organizationId?: string;
  dealId?: string;
  description?: string;
  // Extended fields
  reminderSteps?: ("immediate" | "morning_reminder" | "one_hour_reminder" | "on_time_reminder")[];
  reminderChannels?: ("email" | "whatsapp")[];
  attendeeEmail?: string;
  attendeePhone?: string;
  contactName?: string;
  companyName?: string;
  organizerEmail?: string;
}

@Injectable()
export class SchedulePresentialMeetingUseCase {
  private readonly logger = new Logger(SchedulePresentialMeetingUseCase.name);

  constructor(
    private readonly repo: MeetingsRepository,
    @Optional() @Inject(EvolutionApiPort) private readonly whatsApp: EvolutionApiPort | null,
    @Optional() @Inject(GmailPort) private readonly gmail: GmailPort | null,
    @Optional() @Inject(GoogleCalendarPort) private readonly googleCalendar: GoogleCalendarPort | null,
    @Optional() @Inject(EventEmitter2) private readonly eventEmitter: EventEmitter2 | null,
  ) {}

  async execute(
    input: SchedulePresentialMeetingInput,
  ): Promise<Either<Error, MeetingRecord>> {
    if (!input.title.trim()) return left(new Error("title não pode ser vazio"));

    // Resolve effective attendee emails: prefer explicit attendeeEmail, fall back to attendeeEmails array
    const effectiveAttendeeEmail = input.attendeeEmail ?? input.attendeeEmails[0];
    const effectiveAttendeeEmails = input.attendeeEmail
      ? [...new Set([input.attendeeEmail, ...input.attendeeEmails])]
      : [...new Set(input.attendeeEmails)];

    const meeting = await this.repo.create({
      title: input.title.trim(),
      startAt: input.startAt,
      endAt: input.endAt,
      attendeeEmails: effectiveAttendeeEmails,
      ownerId: input.requesterId,
      leadId: input.leadId,
      contactId: input.contactId,
      organizationId: input.organizationId,
      dealId: input.dealId,
      description: input.description,
      createActivity: true,
      isPresential: true,
      location: input.location,
      confirmationMethod: input.confirmationMethod ?? "none",
    });

    // --- Google Calendar event (no Meet link) ---
    if (this.googleCalendar) {
      try {
        const endAt = input.endAt ?? new Date(input.startAt.getTime() + 60 * 60 * 1000);
        const calResult = await this.googleCalendar.createMeetEvent({
          title: input.title.trim(),
          startAt: input.startAt,
          endAt,
          attendeeEmails: effectiveAttendeeEmail ? [effectiveAttendeeEmail] : [],
          noConference: true,
          location: input.location,
          description: input.description,
          sendUpdates: effectiveAttendeeEmail ? "all" : "none",
        });
        await this.repo.saveGoogleEventId(meeting.id, calResult.googleEventId);
        meeting.googleEventId = calResult.googleEventId;
      } catch (err) {
        this.logger.warn("Google Calendar event creation failed (non-fatal)", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // --- Immediate confirmation ---
    const sendImmediate =
      input.reminderSteps?.includes("immediate") ??
      (input.confirmationMethod !== undefined && input.confirmationMethod !== "none");

    const method = input.confirmationMethod;
    const confirmationPhone = input.attendeePhone ?? input.confirmationPhone;
    let confirmationSent = false;

    if (sendImmediate) {
      if ((method === "whatsapp" || input.reminderChannels?.includes("whatsapp")) && confirmationPhone && this.whatsApp) {
        try {
          const text = this.buildWhatsAppText(meeting, input.location, input.contactName);
          await this.whatsApp.sendText(confirmationPhone, text);
          confirmationSent = true;
        } catch (err) {
          this.logger.warn("WhatsApp confirmation failed (non-fatal)", {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      if ((method === "email" || (!method && input.reminderChannels?.includes("email"))) && effectiveAttendeeEmails.length > 0 && this.gmail) {
        // Resolve organizer: explicit alias → primary account email → fallback
        let primaryEmail = input.organizerEmail ?? "";
        try {
          const profile = await this.gmail.getProfile("google-token-singleton");
          primaryEmail = primaryEmail || profile.emailAddress;
        } catch { /* non-fatal */ }

        const organizerEmail = input.organizerEmail ?? primaryEmail;
        const brand = getBrandConfig(organizerEmail);
        const endAt = input.endAt ?? new Date(input.startAt.getTime() + 60 * 60 * 1000);
        const bodyHtml = buildBrandedEmail({
          brand,
          title: meeting.title,
          startAt: input.startAt,
          endAt,
          location: input.location,
          description: input.description,
          organizerEmail,
          contactName: input.contactName,
          companyName: input.companyName,
        });

        for (const email of effectiveAttendeeEmails) {
          try {
            await this.gmail.sendCalendarInvite({
              userId: "google-token-singleton",
              to: email,
              from: primaryEmail || organizerEmail,
              organizerEmail,
              attendeeEmails: [email],
              subject: `Reunião agendada: ${meeting.title}`,
              bodyHtml,
              startAt: input.startAt,
              endAt,
              title: meeting.title,
              description: input.description,
              googleEventId: meeting.googleEventId ?? undefined,
              meetLink: input.location,
            });
            confirmationSent = true;
          } catch (err) {
            this.logger.warn("Email calendar invite failed (non-fatal)", {
              to: email,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }
    }

    if (confirmationSent) {
      await this.repo.markConfirmationSent(meeting.id);
      meeting.confirmationSentAt = new Date();
    }

    // --- Schedule reminders ---
    const scheduledReminderTypes = (input.reminderSteps ?? []).filter(
      (s): s is "morning_reminder" | "one_hour_reminder" | "on_time_reminder" =>
        s === "morning_reminder" || s === "one_hour_reminder" || s === "on_time_reminder",
    );

    const shouldScheduleReminders =
      scheduledReminderTypes.length > 0 &&
      (effectiveAttendeeEmails.length > 0 || (input.reminderChannels?.includes("whatsapp") && (input.attendeePhone ?? input.confirmationPhone)));

    if (shouldScheduleReminders && this.eventEmitter) {
      this.eventEmitter.emit(
        "meeting.scheduled",
        new MeetingScheduledEvent({
          meetingId: meeting.id,
          title: meeting.title,
          startAt: meeting.startAt,
          endAt: meeting.endAt ?? undefined,
          attendeeEmails: effectiveAttendeeEmails,
          organizerEmail: undefined,
          meetLink: undefined,
          description: input.description,
          contactName: input.contactName,
          companyName: input.companyName,
          reminderTypes: scheduledReminderTypes,
          reminderChannels: input.reminderChannels,
          recipientPhone: input.attendeePhone ?? input.confirmationPhone,
        }),
      );
    }

    return right(meeting);
  }

  private buildWhatsAppText(
    meeting: MeetingRecord & { location?: string | null },
    location?: string,
    contactName?: string,
  ): string {
    const loc = location ?? meeting.location;
    const dateStr = meeting.startAt.toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      timeZone: "America/Sao_Paulo",
    });
    const timeStr = meeting.startAt.toLocaleTimeString("pt-BR", {
      hour: "2-digit", minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });

    const firstName = contactName?.trim().split(/\s+/)[0];
    const greeting = firstName ? `Olá, ${firstName}! 😊` : "Olá! 😊";

    const lines = [
      greeting,
      ``,
      `Conforme combinamos, deixo aqui registrado os detalhes da nossa reunião:`,
      ``,
      `📅 *${meeting.title}*`,
      `🗓 ${dateStr} às ${timeStr}`,
    ];
    if (loc) lines.push(`📍 ${loc}`);
    lines.push(``, `Qualquer imprevisto, é só me avisar. Até lá! 🤝`);
    return lines.join("\n");
  }
}
