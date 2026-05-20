import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "@/infra/auth/auth.module";
import { LeadsModule } from "@/domain/leads/leads.module";
import { ProposalsModule } from "@/domain/proposals/proposals.module";
import { SharedInfraModule } from "@/infra/shared/shared-infra.module";
import { TriggerProposalAgentUseCase } from "./application/use-cases/trigger-proposal-agent.use-case";
import { HandleProposalAgentWebhookUseCase } from "./application/use-cases/handle-proposal-agent-webhook.use-case";
import { AnswerProposalAgentQuestionUseCase } from "./application/use-cases/answer-proposal-agent-question.use-case";
import { CorrectProposalUseCase } from "./application/use-cases/correct-proposal.use-case";
import { ReviseProposalUseCase } from "./application/use-cases/revise-proposal.use-case";
import { ProposalAgentPort } from "./application/ports/proposal-agent.port";
import { ProposalAgentHttpAdapter } from "./infra/proposal-agent-http.adapter";
import { ProposalAgentController } from "./infra/controllers/proposal-agent.controller";

@Module({
  imports: [ConfigModule, AuthModule, LeadsModule, ProposalsModule, SharedInfraModule],
  controllers: [ProposalAgentController],
  providers: [
    TriggerProposalAgentUseCase,
    HandleProposalAgentWebhookUseCase,
    AnswerProposalAgentQuestionUseCase,
    CorrectProposalUseCase,
    ReviseProposalUseCase,
    { provide: ProposalAgentPort, useClass: ProposalAgentHttpAdapter },
  ],
})
export class ProposalAgentModule {}
