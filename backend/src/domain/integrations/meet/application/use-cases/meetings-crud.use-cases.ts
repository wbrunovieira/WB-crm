import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { MeetingsRepository, MeetingRecord, MeetingFilters } from "../repositories/meetings.repository";
import { GoogleCalendarPort } from "../ports/google-calendar.port";

export class MeetingNotFoundError extends Error { name = "MeetingNotFoundError"; }
export class MeetingForbiddenError extends Error { name = "MeetingForbiddenError"; }

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
  constructor(
    private readonly repo: MeetingsRepository,
    private readonly calendarPort: GoogleCalendarPort,
  ) {}

  async execute(input: {
    title: string;
    startAt: Date;
    endAt?: Date;
    attendeeEmails: string[];
    description?: string;
    leadId?: string;
    contactId?: string;
    organizationId?: string;
    dealId?: string;
    requesterId: string;
    createActivity?: boolean;
    skipCalendar?: boolean;
  }): Promise<Either<Error, MeetingRecord>> {
    if (!input.title.trim()) return left(new Error("title não pode ser vazio"));

    let googleEventId: string | undefined;
    let meetLink: string | undefined;

    if (!input.skipCalendar) {
      try {
        const calResult = await this.calendarPort.createMeetEvent({
          title: input.title.trim(),
          startAt: input.startAt,
          endAt: input.endAt ?? new Date(input.startAt.getTime() + 60 * 60 * 1000),
          attendeeEmails: input.attendeeEmails,
          description: input.description,
        });
        googleEventId = calResult.googleEventId;
        meetLink = calResult.meetLink ?? undefined;
      } catch {
        // Calendar failure is non-fatal — meeting is still created without a Google event
      }
    }

    const meeting = await this.repo.create({
      title: input.title.trim(),
      startAt: input.startAt,
      endAt: input.endAt,
      attendeeEmails: input.attendeeEmails,
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
    return right(undefined);
  }
}
