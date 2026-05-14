import { Injectable, Logger, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Either, left, right } from "@/core/either";
import { MeetingsRepository, MeetingRecord, MeetingFilters } from "../repositories/meetings.repository";
import { GoogleCalendarPort } from "../ports/google-calendar.port";
import { GmailPort } from "@/domain/integrations/email/application/ports/gmail.port";
import { MeetingScheduledEvent } from "../../enterprise/events/meeting-scheduled.event";
import { MeetingCancelledEvent } from "../../enterprise/events/meeting-cancelled.event";
import { getBrandConfig, buildBrandedEmail } from "../helpers/brand-email.helper";

export class MeetingNotFoundError extends Error { name = "MeetingNotFoundError"; }
export class MeetingForbiddenError extends Error { name = "MeetingForbiddenError"; }
export class MeetingNotCompletedError extends Error { name = "MeetingNotCompletedError"; }


@Injectable()
export class GetMeetingsUseCase {
  constructor(private readonly repo: MeetingsRepository) {}

  async execute(input: { requesterId: string; filters?: MeetingFilters }): Promise<Either<Error, MeetingRecord[]>> {
    return right(await this.repo.findByOwner(input.requesterId, input.filters));
  }
}

@Injectable()
export class CheckMeetingTitleUseCase {
  constructor(private readonly repo: MeetingsRepository) {}

  async execute(input: { requesterId: string; title: string; excludeId?: string }): Promise<Either<Error, { exists: boolean }>> {
    const exists = await this.repo.titleExistsByOwner(input.requesterId, input.title, input.excludeId);
    return right({ exists });
  }
}

@Injectable()
export class UpdateMeetingSummaryUseCase {
  constructor(private readonly repo: MeetingsRepository) {}

  async execute(input: { id: string; requesterId: string; summary: string | null }): Promise<Either<Error, void>> {
    const meeting = await this.repo.findById(input.id);
    if (!meeting) return left(new MeetingNotFoundError("Reunião não encontrada"));
    if (meeting.ownerId !== input.requesterId) return left(new MeetingForbiddenError("Acesso negado"));
    await this.repo.updateSummary(input.id, input.summary);
    return right(undefined);
  }
}

@Injectable()
export class GetMeetingByIdUseCase {
  constructor(private readonly repo: MeetingsRepository) {}

  async execute(input: { id: string; requesterId: string }): Promise<Either<Error, MeetingRecord>> {
    const meeting = await this.repo.findById(input.id);
    if (!meeting) return left(new MeetingNotFoundError("Reunião não encontrada"));
    if (meeting.ownerId !== input.requesterId) return left(new MeetingForbiddenError("Acesso negado"));
    return right(meeting);
  }
}

@Injectable()
export class ScheduleMeetingUseCase {
  private readonly logger = new Logger(ScheduleMeetingUseCase.name);

  constructor(
    private readonly repo: MeetingsRepository,
    private readonly calendarPort: GoogleCalendarPort,
    private readonly eventEmitter: EventEmitter2,
    @Optional() private readonly gmailPort?: GmailPort,
  ) {}

  async execute(input: {
    title: string;
    startAt: Date;
    endAt?: Date;
    attendeeEmails: string[];
    organizerEmail?: string;
    description?: string;
    leadId?: string;
    contactId?: string;
    organizationId?: string;
    dealId?: string;
    requesterId: string;
    contactName?: string;
    companyName?: string;
    createActivity?: boolean;
    skipCalendar?: boolean;
  }): Promise<Either<Error, MeetingRecord>> {
    if (!input.title.trim()) return left(new Error("title não pode ser vazio"));

    const attendeeEmails = [...new Set(input.attendeeEmails)];

    let googleEventId: string | undefined;
    let meetLink: string | undefined;

    if (!input.skipCalendar) {
      try {
        const calResult = await this.calendarPort.createMeetEvent({
          title: input.title.trim(),
          startAt: input.startAt,
          endAt: input.endAt ?? new Date(input.startAt.getTime() + 60 * 60 * 1000),
          attendeeEmails,
          description: input.description,
          organizerEmail: input.organizerEmail,
          // Always "all" — Google Calendar sends the native RSVP invite; Gmail alias sends a courtesy notification
          sendUpdates: "all",
        });
        googleEventId = calResult.googleEventId;
        meetLink = calResult.meetLink ?? undefined;
      } catch {
        // Calendar failure is non-fatal
      }
    }

    // When an alias is selected, send a courtesy email from the primary Gmail account.
    // Reply-To and Cc point to the alias so the client sees it and replies there.
    // Sending from primary avoids SPF/DKIM failures that block strict providers (e.g. Yahoo).
    const sendAliasEmail = !!input.organizerEmail && !!this.gmailPort && !input.skipCalendar;
    if (sendAliasEmail) {
      const alias = input.organizerEmail!;

      // Fetch primary email so we send explicitly from it (not Gmail's default send-as alias)
      let primaryEmail: string | undefined;
      try {
        const profile = await this.gmailPort!.getProfile("google-token-singleton");
        primaryEmail = profile.emailAddress;
      } catch {
        // Non-fatal: if profile fetch fails, Gmail uses account default
      }
      const title = input.title.trim();
      const brand = getBrandConfig(alias);
      const endAt = input.endAt ?? new Date(input.startAt.getTime() + 60 * 60 * 1000);

      const bodyHtml = buildBrandedEmail({
        brand,
        title,
        startAt: input.startAt,
        endAt,
        meetLink: meetLink ?? undefined,
        description: input.description,
        organizerEmail: alias,
        contactName: input.contactName,
        companyName: input.companyName,
      });

      for (const to of attendeeEmails) {
        try {
          await this.gmailPort!.send({
            userId: "google-token-singleton",
            to,
            from: primaryEmail,
            replyTo: alias,
            cc: alias,
            subject: `Reunião agendada: ${title}`,
            bodyHtml,
          });
        } catch (err) {
          this.logger.warn("Failed to send alias courtesy email", {
            to,
            alias,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    const meeting = await this.repo.create({
      title: input.title.trim(),
      startAt: input.startAt,
      endAt: input.endAt,
      attendeeEmails,
      organizerEmail: input.organizerEmail,
      googleEventId,
      meetLink,
      description: input.description,
      leadId: input.leadId,
      contactId: input.contactId,
      organizationId: input.organizationId,
      dealId: input.dealId,
      ownerId: input.requesterId,
      createActivity: input.createActivity,
    });

    this.eventEmitter.emit("meeting.scheduled", new MeetingScheduledEvent({
      meetingId: meeting.id,
      title: meeting.title,
      startAt: meeting.startAt,
      endAt: meeting.endAt ?? undefined,
      attendeeEmails: JSON.parse(meeting.attendeeEmails as string),
      organizerEmail: meeting.organizerEmail ?? undefined,
      meetLink: meeting.meetLink ?? undefined,
      description: input.description,
      contactName: input.contactName,
      companyName: input.companyName,
    }));

    return right(meeting);
  }
}

@Injectable()
export class UpdateMeetingUseCase {
  constructor(
    private readonly repo: MeetingsRepository,
    private readonly calendarPort: GoogleCalendarPort,
  ) {}

  async execute(input: {
    id: string;
    requesterId: string;
    title?: string;
    startAt?: Date;
    endAt?: Date;
    actualStartAt?: Date;
    actualEndAt?: Date;
    status?: string;
    attendeeEmails?: string[];
  }): Promise<Either<Error, MeetingRecord>> {
    const meeting = await this.repo.findById(input.id);
    if (!meeting) return left(new MeetingNotFoundError("Reunião não encontrada"));
    if (meeting.ownerId !== input.requesterId) return left(new MeetingForbiddenError("Acesso negado"));

    if (meeting.googleEventId && (input.title || input.startAt || input.endAt || input.attendeeEmails)) {
      try {
        await this.calendarPort.updateEvent(meeting.googleEventId, {
          title: input.title,
          startAt: input.startAt,
          endAt: input.endAt,
          attendeeEmails: input.attendeeEmails,
        });
      } catch {
        // Non-fatal — proceed with DB update even if Calendar fails
      }
    }

    const updated = await this.repo.update(input.id, {
      title: input.title,
      startAt: input.startAt,
      endAt: input.endAt,
      actualStartAt: input.actualStartAt,
      actualEndAt: input.actualEndAt,
      status: input.status,
      attendeeEmails: input.attendeeEmails,
    });
    if (meeting.activityId && (input.startAt || input.title)) {
      await this.repo.updateActivitySchedule(meeting.activityId, {
        dueDate: input.startAt,
        subject: input.title ? `Reunião: ${input.title}` : undefined,
      });
    }
    return right(updated);
  }
}

@Injectable()
export class CancelMeetingUseCase {
  constructor(
    private readonly repo: MeetingsRepository,
    private readonly calendarPort: GoogleCalendarPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: { id: string; requesterId: string }): Promise<Either<Error, void>> {
    const meeting = await this.repo.findById(input.id);
    if (!meeting) return left(new MeetingNotFoundError("Reunião não encontrada"));
    if (meeting.ownerId !== input.requesterId) return left(new MeetingForbiddenError("Acesso negado"));

    if (meeting.googleEventId) {
      try {
        await this.calendarPort.cancelEvent(meeting.googleEventId);
      } catch {
        // Non-fatal — proceed with DB cancellation even if Calendar fails
      }
    }

    await this.repo.update(input.id, { status: "cancelled" });
    if (meeting.activityId) {
      await this.repo.skipActivity(meeting.activityId, "Reunião cancelada");
    }
    this.eventEmitter.emit("meeting.cancelled", new MeetingCancelledEvent(input.id));
    return right(undefined);
  }
}
