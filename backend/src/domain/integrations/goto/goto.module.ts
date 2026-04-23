import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
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

// Infrastructure
import { GoToApiClient } from "./infra/goto-api.client";
import { GoToTokenService } from "./infra/goto-token.service";
import { S3RecordingClient } from "./infra/s3-recording.client";
import { GoToWebhookController } from "./infra/controllers/goto-webhook.controller";
import { GoToRecordingsController } from "./infra/controllers/goto-recordings.controller";
import { GoToRecordingCronService } from "./infra/scheduled/goto-recording-cron.service";

@Module({
  imports: [ScheduleModule.forRoot(), SharedInfraModule, ActivitiesModule, AuthModule],
  controllers: [GoToWebhookController, GoToRecordingsController],
  providers: [
    // Use Cases
    HandleGotoWebhookUseCase,
    CreateCallActivityUseCase,
    SyncGotoCallReportsUseCase,
    ProcessCallRecordingUseCase,
    PollCallTranscriptionsUseCase,
    // Port implementations
    { provide: GoToApiPort, useClass: GoToApiClient },
    { provide: GoToTokenPort, useClass: GoToTokenService },
    { provide: S3StoragePort, useClass: S3RecordingClient },
    // Scheduled
    GoToRecordingCronService,
  ],
})
export class GoToModule {}
