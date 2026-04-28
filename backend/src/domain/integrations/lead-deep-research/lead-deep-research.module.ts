import { Module } from "@nestjs/common";
import { SharedInfraModule } from "@/infra/shared/shared-infra.module";
import { LeadsModule } from "@/domain/leads/leads.module";
import { RequestLeadDeepResearchUseCase } from "./application/use-cases/request-lead-deep-research.use-case";
import { HandleLeadDeepResearchWebhookUseCase } from "./application/use-cases/handle-lead-deep-research-webhook.use-case";
import { AgentDeepResearchPort } from "./application/ports/agent-deep-research.port";
import { LeadAgentResearchLogRepository } from "./application/repositories/lead-agent-research-log.repository";
import { AgentDeepResearchHttpAdapter } from "./infra/agent-deep-research-http.adapter";
import { PrismaLeadAgentResearchLogRepository } from "./infra/prisma-lead-agent-research-log.repository";
import { LeadDeepResearchController } from "./infra/controllers/lead-deep-research.controller";

@Module({
  imports: [SharedInfraModule, LeadsModule],
  controllers: [LeadDeepResearchController],
  providers: [
    RequestLeadDeepResearchUseCase,
    HandleLeadDeepResearchWebhookUseCase,
    { provide: AgentDeepResearchPort, useClass: AgentDeepResearchHttpAdapter },
    { provide: LeadAgentResearchLogRepository, useClass: PrismaLeadAgentResearchLogRepository },
  ],
})
export class LeadDeepResearchModule {}
