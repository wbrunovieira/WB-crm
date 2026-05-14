import { Module } from "@nestjs/common";
import { SharedInfraModule } from "@/infra/shared/shared-infra.module";
import { EmailModule } from "@/domain/integrations/email/email.module";
import { EvolutionApiPort } from "@/domain/integrations/whatsapp/application/ports/evolution-api.port";
import { EvolutionApiClient } from "@/domain/integrations/whatsapp/infra/evolution-api.client";

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
import { PurgeCompletedMeetingUseCase } from "./application/use-cases/purge-completed-meeting.use-case";
import { SchedulePresentialMeetingUseCase } from "./application/use-cases/schedule-presential-meeting.use-case";
import { UploadPresentialRecordingUseCase } from "./application/use-cases/upload-presential-recording.use-case";
import { EndMeetingUseCase } from "./application/use-cases/end-meeting.use-case";
import { ResendMeetingConfirmationUseCase } from "./application/use-cases/resend-meeting-confirmation.use-case";
import { PresentialRecordingStoragePort } from "./application/ports/presential-recording-storage.port";

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
import { PresentialRecordingS3Adapter } from "./infra/presential-recording-s3.adapter";
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

    // Use Cases — admin
    PurgeCompletedMeetingUseCase,

    // Use Cases — presential meetings
    SchedulePresentialMeetingUseCase,
    UploadPresentialRecordingUseCase,
    EndMeetingUseCase,
    ResendMeetingConfirmationUseCase,

    // Port implementations
    { provide: GoogleDrivePort, useClass: GoogleDriveClient },
    { provide: GoogleCalendarPort, useClass: GoogleCalendarClient },
    { provide: PresentialRecordingStoragePort, useClass: PresentialRecordingS3Adapter },
    { provide: EvolutionApiPort, useClass: EvolutionApiClient },

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
