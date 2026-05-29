import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { DatabaseModule } from "@/infra/database/database.module";
import { GetFunnelStatsUseCase, GetWeeklyGoalsUseCase, UpsertWeeklyGoalUseCase, GetWeeklyFunnelDataUseCase } from "./application/use-cases/funnel.use-cases";
import { FunnelRepository } from "./application/repositories/funnel.repository";
import { PrismaFunnelRepository } from "@/infra/database/prisma/repositories/funnel/prisma-funnel.repository";
import { FunnelController } from "./infra/controllers/funnel.controller";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [FunnelController],
  providers: [
    GetFunnelStatsUseCase, GetWeeklyGoalsUseCase, UpsertWeeklyGoalUseCase, GetWeeklyFunnelDataUseCase,
    { provide: FunnelRepository, useClass: PrismaFunnelRepository },
  ],
})
export class FunnelModule {}
