import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { DatabaseModule } from "@/infra/database/database.module";
import {
  GetManagerStatsUseCase,
  GetTimelineDataUseCase,
  GetActivityCalendarUseCase,
} from "./application/use-cases/dashboard.use-cases";
import { DashboardController } from "./infra/controllers/dashboard.controller";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [DashboardController],
  providers: [GetManagerStatsUseCase, GetTimelineDataUseCase, GetActivityCalendarUseCase],
})
export class DashboardModule {}
