import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { MeetAnalysisRepository } from "./application/repositories/meet-analysis.repository";
import { MeetAnalysisAgentPort } from "./application/ports/meet-analysis-agent.port";
import { TriggerMeetAnalysisUseCase } from "./application/use-cases/trigger-meet-analysis.use-case";
import { HandleMeetAnalysisWebhookUseCase } from "./application/use-cases/handle-meet-analysis-webhook.use-case";
import { GetMeetAnalysisUseCase } from "./application/use-cases/get-meet-analysis.use-case";
import { ListMeetAnalysesUseCase } from "./application/use-cases/list-meet-analyses.use-case";
import { HttpMeetAnalysisAgentClient } from "./infra/http-meet-analysis-agent.client";
import { PrismaMeetAnalysisRepository } from "@/infra/database/prisma/repositories/meet-analysis/prisma-meet-analysis.repository";
import { MeetingsRepository } from "@/domain/integrations/meet/application/repositories/meetings.repository";
import { PrismaMeetingsRepository } from "@/domain/integrations/meet/infra/prisma-meetings.repository";
import { MeetAnalysisController } from "./infra/controllers/meet-analysis.controller";

@Module({
  imports: [AuthModule],
  controllers: [MeetAnalysisController],
  providers: [
    TriggerMeetAnalysisUseCase,
    HandleMeetAnalysisWebhookUseCase,
    GetMeetAnalysisUseCase,
    ListMeetAnalysesUseCase,
    { provide: MeetAnalysisRepository, useClass: PrismaMeetAnalysisRepository },
    { provide: MeetAnalysisAgentPort, useClass: HttpMeetAnalysisAgentClient },
    { provide: MeetingsRepository, useClass: PrismaMeetingsRepository },
  ],
  exports: [TriggerMeetAnalysisUseCase, GetMeetAnalysisUseCase, ListMeetAnalysesUseCase],
})
export class MeetAnalysisModule {}
