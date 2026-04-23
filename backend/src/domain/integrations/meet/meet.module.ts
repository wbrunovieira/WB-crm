import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { SharedInfraModule } from "@/infra/shared/shared-infra.module";
import { EmailModule } from "@/domain/integrations/email/email.module";

// Ports
import { GoogleDrivePort } from "./application/ports/google-drive.port";
import { GoogleCalendarPort } from "./application/ports/google-calendar.port";

// Repository
import { MeetingsRepository } from "./application/repositories/meetings.repository";

// Use Cases
import { DetectMeetRecordingsUseCase } from "./application/use-cases/detect-meet-recordings.use-case";
import { PollMeetTranscriptionsUseCase } from "./application/use-cases/poll-meet-transcriptions.use-case";
import { RefreshMeetRsvpUseCase } from "./application/use-cases/refresh-meet-rsvp.use-case";
import {
  GetMeetingsUseCase, GetMeetingByIdUseCase, ScheduleMeetingUseCase,
  UpdateMeetingUseCase, CancelMeetingUseCase,
  CheckMeetingTitleUseCase, UpdateMeetingSummaryUseCase,
} from "./application/use-cases/meetings-crud.use-cases";

// Infrastructure
import { GoogleDriveClient } from "./infra/google-drive.client";
import { GoogleCalendarClient } from "./infra/google-calendar.client";
import { PrismaMeetingsRepository } from "./infra/prisma-meetings.repository";
import { MeetRecordingsCronService } from "./infra/scheduled/meet-recordings-cron.service";
import { MeetTranscriptionsCronService } from "./infra/scheduled/meet-transcriptions-cron.service";
import { MeetRsvpCronService } from "./infra/scheduled/meet-rsvp-cron.service";
import { MeetingsCrudController } from "./infra/meetings-crud.controller";
import { AuthModule } from "@/infra/auth/auth.module";

@Module({
  imports: [ScheduleModule.forRoot(), SharedInfraModule, AuthModule, EmailModule],
  controllers: [MeetingsCrudController],
  providers: [
    // Use Cases
    DetectMeetRecordingsUseCase,
    PollMeetTranscriptionsUseCase,
    RefreshMeetRsvpUseCase,
    GetMeetingsUseCase,
    GetMeetingByIdUseCase,
    ScheduleMeetingUseCase,
    UpdateMeetingUseCase,
    CancelMeetingUseCase,
    CheckMeetingTitleUseCase,
    UpdateMeetingSummaryUseCase,

    // Port implementations
    { provide: GoogleDrivePort, useClass: GoogleDriveClient },
    { provide: GoogleCalendarPort, useClass: GoogleCalendarClient },

    // Repository implementation
    PrismaMeetingsRepository,
    { provide: MeetingsRepository, useClass: PrismaMeetingsRepository },

    // Scheduled
    MeetRecordingsCronService,
    MeetTranscriptionsCronService,
    MeetRsvpCronService,
  ],
})
export class MeetModule {}
