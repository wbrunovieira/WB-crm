import { Module } from "@nestjs/common";
import { SharedInfraModule } from "@/infra/shared/shared-infra.module";
import { EmailModule } from "@/domain/integrations/email/email.module";

// Ports
import { GoogleDrivePort } from "./application/ports/google-drive.port";
import { GoogleCalendarPort } from "./application/ports/google-calendar.port";

// Repositories
import { MeetingsRepository } from "./application/repositories/meetings.repository";
import { ScheduledEmailsRepository } from "./application/repositories/scheduled-emails.repository";

// Use Cases
import { DetectMeetRecordingsUseCase } from "./application/use-cases/detect-meet-recordings.use-case";
import { PollMeetTranscriptionsUseCase } from "./application/use-cases/poll-meet-transcriptions.use-case";
import { RefreshMeetRsvpUseCase } from "./application/use-cases/refresh-meet-rsvp.use-case";
import {
  GetMeetingsUseCase, GetMeetingByIdUseCase, ScheduleMeetingUseCase,
  UpdateMeetingUseCase, CancelMeetingUseCase,
  CheckMeetingTitleUseCase, UpdateMeetingSummaryUseCase,
} from "./application/use-cases/meetings-crud.use-cases";
import { CreateMeetingRemindersUseCase } from "./application/use-cases/create-meeting-reminders.use-case";
import { CancelMeetingRemindersUseCase } from "./application/use-cases/cancel-meeting-reminders.use-case";
import { SendScheduledEmailsUseCase } from "./application/use-cases/send-scheduled-emails.use-case";

// Infrastructure
import { GoogleDriveClient } from "./infra/google-drive.client";
import { GoogleCalendarClient } from "./infra/google-calendar.client";
import { PrismaMeetingsRepository } from "./infra/prisma-meetings.repository";
import { PrismaScheduledEmailsRepository } from "./infra/prisma-scheduled-emails.repository";
import { MeetRecordingsCronService } from "./infra/scheduled/meet-recordings-cron.service";
import { MeetTranscriptionsCronService } from "./infra/scheduled/meet-transcriptions-cron.service";
import { MeetRsvpCronService } from "./infra/scheduled/meet-rsvp-cron.service";
import { MeetingRemindersCronService } from "./infra/scheduled/meeting-reminders-cron.service";
import { MeetingScheduledListener } from "./infra/listeners/meeting-scheduled.listener";
import { MeetingCancelledListener } from "./infra/listeners/meeting-cancelled.listener";
import { MeetingsCrudController } from "./infra/meetings-crud.controller";
import { AuthModule } from "@/infra/auth/auth.module";

@Module({
  imports: [SharedInfraModule, AuthModule, EmailModule],
  controllers: [MeetingsCrudController],
  providers: [
    // Use Cases — meetings CRUD
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

    // Use Cases — reminders
    CreateMeetingRemindersUseCase,
    CancelMeetingRemindersUseCase,
    SendScheduledEmailsUseCase,

    // Port implementations
    { provide: GoogleDrivePort, useClass: GoogleDriveClient },
    { provide: GoogleCalendarPort, useClass: GoogleCalendarClient },

    // Repository implementations
    PrismaMeetingsRepository,
    { provide: MeetingsRepository, useClass: PrismaMeetingsRepository },
    PrismaScheduledEmailsRepository,
    { provide: ScheduledEmailsRepository, useClass: PrismaScheduledEmailsRepository },

    // Cron services
    MeetRecordingsCronService,
    MeetTranscriptionsCronService,
    MeetRsvpCronService,
    MeetingRemindersCronService,

    // Event listeners
    MeetingScheduledListener,
    MeetingCancelledListener,
  ],
})
export class MeetModule {}
