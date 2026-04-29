import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { CallAnalysisRepository } from "./application/repositories/call-analysis.repository";
import { CallAnalysisAgentPort } from "./application/ports/call-analysis-agent.port";
import { TriggerCallAnalysisUseCase } from "./application/use-cases/trigger-call-analysis.use-case";
import { HandleCallAnalysisWebhookUseCase } from "./application/use-cases/handle-call-analysis-webhook.use-case";
import { GetCallAnalysisUseCase } from "./application/use-cases/get-call-analysis.use-case";
import { ListCallAnalysesUseCase } from "./application/use-cases/list-call-analyses.use-case";
import { HttpCallAnalysisAgentClient } from "./infra/http-call-analysis-agent.client";
import { PrismaCallAnalysisRepository } from "@/infra/database/prisma/repositories/call-analysis/prisma-call-analysis.repository";
import { CallAnalysisController } from "./infra/controllers/call-analysis.controller";

@Module({
  imports: [AuthModule],
  controllers: [CallAnalysisController],
  providers: [
    TriggerCallAnalysisUseCase,
    HandleCallAnalysisWebhookUseCase,
    GetCallAnalysisUseCase,
    ListCallAnalysesUseCase,
    { provide: CallAnalysisRepository, useClass: PrismaCallAnalysisRepository },
    { provide: CallAnalysisAgentPort, useClass: HttpCallAnalysisAgentClient },
  ],
  exports: [TriggerCallAnalysisUseCase, GetCallAnalysisUseCase, ListCallAnalysesUseCase],
})
export class CallAnalysisModule {}
