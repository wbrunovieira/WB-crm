import { Injectable, Logger, Optional } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { MeetingsRepository } from "../repositories/meetings.repository";
import { GoogleDrivePort } from "../ports/google-drive.port";
import { GoogleCalendarPort } from "../ports/google-calendar.port";
import { MeetingNotFoundError, MeetingForbiddenError } from "./meetings-crud.use-cases";

@Injectable()
export class PurgeCompletedMeetingUseCase {
  private readonly logger = new Logger(PurgeCompletedMeetingUseCase.name);

  constructor(
    private readonly repo: MeetingsRepository,
    @Optional() private readonly drivePort?: GoogleDrivePort,
    @Optional() private readonly calendarPort?: GoogleCalendarPort,
  ) {}

  async execute(input: {
    id: string;
    requesterId: string;
    isAdmin: boolean;
  }): Promise<Either<Error, void>> {
    // Only admins can permanently delete meetings
    if (!input.isAdmin) return left(new MeetingForbiddenError("Apenas administradores podem excluir reuniões"));

    const meeting = await this.repo.findById(input.id);
    if (!meeting) return left(new MeetingNotFoundError("Reunião não encontrada"));

    // Cancel Google Calendar event for scheduled meetings (non-fatal)
    if (meeting.status === "scheduled" && meeting.googleEventId && this.calendarPort) {
      try {
        await this.calendarPort.cancelEvent(meeting.googleEventId);
      } catch (err) {
        this.logger.warn(`Failed to cancel Calendar event ${meeting.googleEventId}: ${(err as Error).message}`);
      }
    }

    // Delete Drive recording (non-fatal)
    if (meeting.recordingDriveId && this.drivePort) {
      try {
        await this.drivePort.deleteFile(meeting.recordingDriveId);
      } catch (err) {
        this.logger.warn(`Failed to delete Drive file ${meeting.recordingDriveId}: ${(err as Error).message}`);
      }
    }

    // Delete linked activity
    if (meeting.activityId) {
      await this.repo.deleteActivity(meeting.activityId);
    }

    // Hard-delete the meeting (cascades scheduled_emails via FK)
    await this.repo.delete(input.id);

    return right(undefined);
  }
}
