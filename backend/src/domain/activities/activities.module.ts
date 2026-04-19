import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
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
import { ActivitiesController } from "@/infra/controllers/activities.controller";

@Module({
  imports: [AuthModule],
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
  ],
  exports: [ActivitiesRepository],
})
export class ActivitiesModule {}
