import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { ProposalsRepository } from "@/domain/proposals/application/repositories/proposals.repository";
import { ProposalAgentPort } from "../ports/proposal-agent.port";

type Input = {
  proposalId: string;
  requesterId: string;
  answer: string;
};

type Output = Either<Error, void>;

@Injectable()
export class AnswerProposalAgentQuestionUseCase {
  constructor(
    private readonly proposalsRepo: ProposalsRepository,
    private readonly agentPort: ProposalAgentPort,
  ) {}

  async execute({ proposalId, requesterId, answer }: Input): Promise<Output> {
    const proposal = await this.proposalsRepo.findById(proposalId);
    if (!proposal) return left(new Error("Proposta não encontrada"));
    if (proposal.ownerId !== requesterId) return left(new Error("Acesso negado"));
    if (proposal.agentStatus !== "awaiting_answer") {
      return left(new Error("Proposta não está aguardando resposta"));
    }
    if (!proposal.agentJobId) return left(new Error("jobId do agente não encontrado"));

    try {
      await this.agentPort.answer({ jobId: proposal.agentJobId, answer });
    } catch (err) {
      return left(new Error(`Falha ao enviar resposta ao agente: ${String(err)}`));
    }

    proposal.update({ agentStatus: "processing", agentCurrentQuestion: null });
    await this.proposalsRepo.save(proposal);

    return right(undefined);
  }
}
