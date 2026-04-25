import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { SharedInfraModule } from "@/infra/shared/shared-infra.module";
import { S3StoragePort } from "@/domain/integrations/goto/application/ports/s3-storage.port";
import { S3RecordingClient } from "@/domain/integrations/goto/infra/s3-recording.client";
import { GmailPort } from "@/domain/integrations/email/application/ports/gmail.port";
import { GmailClient } from "@/domain/integrations/email/infra/gmail.client";
import { GoogleOAuthPort } from "@/domain/integrations/email/application/ports/google-oauth.port";
import { GoogleOAuthService } from "@/domain/integrations/email/infra/google-oauth.service";
import { ActivitiesRepository } from "./application/repositories/activities.repository";
import { PrismaActivitiesRepository } from "@/infra/database/prisma/repositories/activities/prisma-activities.repository";
import { GetActivitiesUseCase } from "./application/use-cases/get-activities.use-case";
import { GetActivityByIdUseCase } from "./application/use-cases/get-activity-by-id.use-case";
import { CreateActivityUseCase } from "./application/use-cases/create-activity.use-case";
import { UpdateActivityUseCase } from "./application/use-cases/update-activity.use-case";
import { DeleteActivityUseCase } from "./application/use-cases/delete-activity.use-case";
import { ToggleActivityCompletedUseCase } from "./application/use-cases/toggle-activity-completed.use-case";
import { MarkActivityFailedUseCase } from "./application/use-cases/mark-activity-failed.use-case";
import { MarkActivitySkippedUseCase } from "./application/use-cases/mark-activity-skipped.use-case";
import { RevertActivityOutcomeUseCase } from "./application/use-cases/revert-activity-outcome.use-case";
import { LinkActivityToDealUseCase } from "./application/use-cases/link-activity-to-deal.use-case";
import { UnlinkActivityFromDealUseCase } from "./application/use-cases/unlink-activity-from-deal.use-case";
import { MarkThreadRepliedUseCase } from "./application/use-cases/mark-thread-replied.use-case";
import { PurgeActivityUseCase } from "./application/use-cases/purge-activity.use-case";
import { ActivitiesController } from "@/infra/controllers/activities.controller";

@Module({
  imports: [AuthModule, SharedInfraModule],
  controllers: [ActivitiesController],
  providers: [
    { provide: ActivitiesRepository, useClass: PrismaActivitiesRepository },
    GetActivitiesUseCase,
    GetActivityByIdUseCase,
    CreateActivityUseCase,
    UpdateActivityUseCase,
    DeleteActivityUseCase,
    ToggleActivityCompletedUseCase,
    MarkActivityFailedUseCase,
    MarkActivitySkippedUseCase,
    RevertActivityOutcomeUseCase,
    LinkActivityToDealUseCase,
    UnlinkActivityFromDealUseCase,
    MarkThreadRepliedUseCase,
    PurgeActivityUseCase,
    { provide: S3StoragePort, useClass: S3RecordingClient },
    { provide: GmailPort, useClass: GmailClient },
    { provide: GoogleOAuthPort, useClass: GoogleOAuthService },
  ],
  exports: [ActivitiesRepository],
})
export class ActivitiesModule {}
