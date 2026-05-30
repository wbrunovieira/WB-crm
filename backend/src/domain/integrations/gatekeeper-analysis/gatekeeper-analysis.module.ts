import { Module } from "@nestjs/common";
import { AuthModule } from "@/infra/auth/auth.module";
import { ActivitiesModule } from "@/domain/activities/activities.module";
import { GatekeeperAnalysisRepository } from "./application/repositories/gatekeeper-analysis.repository";
import { GatekeeperBatchRepository } from "./application/repositories/gatekeeper-batch.repository";
import { GatekeeperAnalysisAgentPort } from "./application/ports/gatekeeper-analysis-agent.port";
import { GatekeeperBatchAgentPort } from "./application/ports/gatekeeper-batch-agent.port";
import { TriggerGatekeeperAnalysisUseCase } from "./application/use-cases/trigger-gatekeeper-analysis.use-case";
import { HandleGatekeeperAnalysisWebhookUseCase } from "./application/use-cases/handle-gatekeeper-analysis-webhook.use-case";
import { TriggerGatekeeperBatchUseCase } from "./application/use-cases/trigger-gatekeeper-batch.use-case";
import { HandleGatekeeperBatchWebhookUseCase } from "./application/use-cases/handle-gatekeeper-batch-webhook.use-case";
import { HttpGatekeeperAnalysisAgentClient } from "./infra/http-gatekeeper-analysis-agent.client";
import { HttpGatekeeperBatchAgentClient } from "./infra/http-gatekeeper-batch-agent.client";
import { PrismaGatekeeperAnalysisRepository } from "@/infra/database/prisma/repositories/gatekeeper-analysis/prisma-gatekeeper-analysis.repository";
import { PrismaGatekeeperBatchRepository } from "@/infra/database/prisma/repositories/gatekeeper-analysis/prisma-gatekeeper-batch.repository";
import { GatekeeperAnalysisController } from "./infra/controllers/gatekeeper-analysis.controller";

@Module({
  imports: [AuthModule, ActivitiesModule],
  controllers: [GatekeeperAnalysisController],
  providers: [
    TriggerGatekeeperAnalysisUseCase,
    HandleGatekeeperAnalysisWebhookUseCase,
    TriggerGatekeeperBatchUseCase,
    HandleGatekeeperBatchWebhookUseCase,
    { provide: GatekeeperAnalysisRepository, useClass: PrismaGatekeeperAnalysisRepository },
    { provide: GatekeeperBatchRepository, useClass: PrismaGatekeeperBatchRepository },
    { provide: GatekeeperAnalysisAgentPort, useClass: HttpGatekeeperAnalysisAgentClient },
    { provide: GatekeeperBatchAgentPort, useClass: HttpGatekeeperBatchAgentClient },
  ],
  exports: [TriggerGatekeeperAnalysisUseCase],
})
export class GatekeeperAnalysisModule {}
