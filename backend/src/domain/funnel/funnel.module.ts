import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { DatabaseModule } from "@/infra/database/database.module";
import { GetFunnelStatsUseCase, GetWeeklyGoalsUseCase, UpsertWeeklyGoalUseCase, GetWeeklyFunnelDataUseCase } from "./application/use-cases/funnel.use-cases";
import { FunnelController } from "./infra/controllers/funnel.controller";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [FunnelController],
  providers: [GetFunnelStatsUseCase, GetWeeklyGoalsUseCase, UpsertWeeklyGoalUseCase, GetWeeklyFunnelDataUseCase],
})
export class FunnelModule {}
