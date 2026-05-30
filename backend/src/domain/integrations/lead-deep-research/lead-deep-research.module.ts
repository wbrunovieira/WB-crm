import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SharedInfraModule } from "@/infra/shared/shared-infra.module";
import { AuthModule } from "@/infra/auth/auth.module";
import { LeadsModule } from "@/domain/leads/leads.module";
import { RequestLeadDeepResearchUseCase } from "./application/use-cases/request-lead-deep-research.use-case";
import { HandleLeadDeepResearchWebhookUseCase } from "./application/use-cases/handle-lead-deep-research-webhook.use-case";
import { StartBulkLeadResearchUseCase } from "./application/use-cases/start-bulk-lead-research.use-case";
import { GetActiveBulkResearchUseCase } from "./application/use-cases/get-active-bulk-research.use-case";
import { CancelActiveResearchSessionsUseCase } from "./application/use-cases/cancel-active-research-sessions.use-case";
import { AgentDeepResearchPort } from "./application/ports/agent-deep-research.port";
import { LeadAgentResearchLogRepository } from "./application/repositories/lead-agent-research-log.repository";
import { BulkResearchSessionRepository } from "./application/repositories/bulk-research-session.repository";
import { AgentDeepResearchHttpAdapter } from "./infra/agent-deep-research-http.adapter";
import { PrismaLeadAgentResearchLogRepository } from "./infra/prisma-lead-agent-research-log.repository";
import { PrismaBulkResearchSessionRepository } from "./infra/prisma-bulk-research-session.repository";
import { LeadDeepResearchController } from "./infra/controllers/lead-deep-research.controller";

@Module({
  imports: [ConfigModule, SharedInfraModule, AuthModule, LeadsModule],
  controllers: [LeadDeepResearchController],
  providers: [
    RequestLeadDeepResearchUseCase,
    HandleLeadDeepResearchWebhookUseCase,
    StartBulkLeadResearchUseCase,
    GetActiveBulkResearchUseCase,
    CancelActiveResearchSessionsUseCase,
    { provide: AgentDeepResearchPort, useClass: AgentDeepResearchHttpAdapter },
    { provide: LeadAgentResearchLogRepository, useClass: PrismaLeadAgentResearchLogRepository },
    { provide: BulkResearchSessionRepository, useClass: PrismaBulkResearchSessionRepository },
  ],
})
export class LeadDeepResearchModule {}
