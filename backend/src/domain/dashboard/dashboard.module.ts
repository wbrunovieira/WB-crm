import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { DatabaseModule } from "@/infra/database/database.module";
import {
  GetManagerStatsUseCase,
  GetTimelineDataUseCase,
  GetActivityCalendarUseCase,
} from "./application/use-cases/dashboard.use-cases";
import { DashboardRepository } from "./application/repositories/dashboard.repository";
import { PrismaDashboardRepository } from "@/infra/database/prisma/repositories/dashboard/prisma-dashboard.repository";
import { DashboardController } from "./infra/controllers/dashboard.controller";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [DashboardController],
  providers: [
    GetManagerStatsUseCase,
    GetTimelineDataUseCase,
    GetActivityCalendarUseCase,
    { provide: DashboardRepository, useClass: PrismaDashboardRepository },
  ],
})
export class DashboardModule {}
