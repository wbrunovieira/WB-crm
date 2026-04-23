import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { EventEmitterModule, EventEmitter2 } from "@nestjs/event-emitter";
import { ActivitiesModule } from "@/domain/activities/activities.module";
import { SharedInfraModule } from "@/infra/shared/shared-infra.module";
import { AuthModule } from "@/infra/auth/auth.module";

// Ports
import { GoToApiPort } from "./application/ports/goto-api.port";
import { GoToTokenPort } from "./application/ports/goto-token.port";
import { S3StoragePort } from "./application/ports/s3-storage.port";

// Use Cases
import { HandleGotoWebhookUseCase } from "./application/use-cases/handle-goto-webhook.use-case";
import { CreateCallActivityUseCase } from "./application/use-cases/create-call-activity.use-case";
import { ProcessCallRecordingUseCase } from "./application/use-cases/process-call-recording.use-case";
import { PollCallTranscriptionsUseCase } from "./application/use-cases/poll-call-transcriptions.use-case";
import { SyncGotoCallReportsUseCase } from "./application/use-cases/sync-goto-call-reports.use-case";
import { HandleTranscriptionCallbackUseCase } from "./application/use-cases/handle-transcription-callback.use-case";

// Infrastructure
import { GoToApiClient } from "./infra/goto-api.client";
import { GoToTokenService } from "./infra/goto-token.service";
import { S3RecordingClient } from "./infra/s3-recording.client";
import { GoToWebhookController } from "./infra/controllers/goto-webhook.controller";
import { GoToRecordingsController } from "./infra/controllers/goto-recordings.controller";
import { TranscriptionWebhookController } from "./infra/controllers/transcription-webhook.controller";
import { GoToRecordingCronService } from "./infra/scheduled/goto-recording-cron.service";
import { GotoActivityCreatedListener } from "./infra/listeners/goto-activity-created.listener";
import { GotoTranscriptionPollerListener } from "./infra/listeners/goto-transcription-poller.listener";

@Module({
  imports: [ScheduleModule.forRoot(), EventEmitterModule, SharedInfraModule, ActivitiesModule, AuthModule],
  controllers: [GoToWebhookController, GoToRecordingsController, TranscriptionWebhookController],
  providers: [
    // Use Cases
    HandleGotoWebhookUseCase,
    CreateCallActivityUseCase,
    {
      provide: SyncGotoCallReportsUseCase,
      useFactory: (goToApi: GoToApiPort, goToToken: GoToTokenPort, createActivity: CreateCallActivityUseCase, emitter: EventEmitter2) =>
        new SyncGotoCallReportsUseCase(goToApi, goToToken, createActivity, emitter),
      inject: [GoToApiPort, GoToTokenPort, CreateCallActivityUseCase, EventEmitter2],
    },
    ProcessCallRecordingUseCase,
    PollCallTranscriptionsUseCase,
    HandleTranscriptionCallbackUseCase,
    // Port implementations
    { provide: GoToApiPort, useClass: GoToApiClient },
    { provide: GoToTokenPort, useClass: GoToTokenService },
    { provide: S3StoragePort, useClass: S3RecordingClient },
    // Scheduled
    GoToRecordingCronService,
    // Event listeners
    {
      provide: GotoActivityCreatedListener,
      useFactory: (processRecording: ProcessCallRecordingUseCase, eventEmitter: EventEmitter2) =>
        new GotoActivityCreatedListener(processRecording, eventEmitter, 2 * 60 * 1000),
      inject: [ProcessCallRecordingUseCase, EventEmitter2],
    },
    {
      provide: GotoTranscriptionPollerListener,
      useFactory: (pollTranscriptions: PollCallTranscriptionsUseCase) =>
        new GotoTranscriptionPollerListener(pollTranscriptions, 60 * 1000, 30),
      inject: [PollCallTranscriptionsUseCase],
    },
  ],
})
export class GoToModule {}
