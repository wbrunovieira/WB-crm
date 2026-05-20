import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { ProposalsRepository } from "@/domain/proposals/application/repositories/proposals.repository";
import { LeadsRepository } from "@/domain/leads/application/repositories/leads.repository";
import { ProposalAgentPort } from "../ports/proposal-agent.port";

export type CorrectProposalInput = {
  proposalId: string;
  requesterId: string;
  requesterRole: string;
  instructions: string;
};

type Output = Either<Error, { proposalId: string; jobId: string }>;

@Injectable()
export class CorrectProposalUseCase {
  constructor(
    private readonly proposalsRepo: ProposalsRepository,
    private readonly leadsRepo: LeadsRepository,
    private readonly agentPort: ProposalAgentPort,
  ) {}

  async execute(input: CorrectProposalInput): Promise<Output> {
    const proposal = await this.proposalsRepo.findById(input.proposalId);
    if (!proposal) return left(new Error("Proposta não encontrada"));

    if (!proposal.driveUrl) return left(new Error("Proposta não possui arquivo no Drive. Gere a proposta antes de corrigi-la."));

    const lead = proposal.leadId
      ? await this.leadsRepo.findById(proposal.leadId, input.requesterId, input.requesterRole)
      : null;

    const baseUrl = process.env.BACKEND_PUBLIC_URL ?? "https://crm.wbdigitalsolutions.com";
    const webhookUrl = `${baseUrl}/webhooks/proposal-agent`;

    proposal.update({ agentStatus: "processing", agentTriggeredAt: new Date() });
    await this.proposalsRepo.save(proposal);

    let jobId: string;
    try {
      const result = await this.agentPort.correct({
        proposalId: proposal.id.toString(),
        driveUrl: proposal.driveUrl,
        instructions: input.instructions,
        brand: "wb",
        webhookUrl,
        lead: {
          businessName: lead?.businessName ?? "",
          city: lead?.city,
          state: lead?.state,
          website: lead?.website,
        },
      });
      jobId = result.jobId;
    } catch (err) {
      proposal.update({ agentStatus: "error" });
      await this.proposalsRepo.save(proposal);
      return left(new Error(`Falha ao acionar o agente de correção: ${String(err)}`));
    }

    proposal.update({ agentJobId: jobId, agentStatus: "processing" });
    await this.proposalsRepo.save(proposal);

    return right({ proposalId: proposal.id.toString(), jobId });
  }
}
