import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Either, left, right } from "@/core/either";
import { LeadsRepository } from "@/domain/leads/application/repositories/leads.repository";
import { ProposalsRepository } from "@/domain/proposals/application/repositories/proposals.repository";
import { Proposal } from "@/domain/proposals/enterprise/entities/proposal";
import { ProposalAgentPort, type ProposalContact } from "../ports/proposal-agent.port";

export type TriggerProposalAgentInput = {
  leadId: string;
  requesterId: string;
  requesterRole: string;
  brand: "wb" | "salto";
  contacts: ProposalContact[];
  instructions?: string;
};

type Output = Either<Error, { proposalId: string; jobId: string }>;

@Injectable()
export class TriggerProposalAgentUseCase {
  constructor(
    private readonly leadsRepo: LeadsRepository,
    private readonly proposalsRepo: ProposalsRepository,
    private readonly agentPort: ProposalAgentPort,
    private readonly config: ConfigService,
  ) {}

  async execute(input: TriggerProposalAgentInput): Promise<Output> {
    const lead = await this.leadsRepo.findById(input.leadId, input.requesterId, input.requesterRole);
    if (!lead) return left(new Error("Lead não encontrado"));

    const contactNames = input.contacts.map((c) => c.name).join(", ") || "Prezado(a)";
    const title = `Proposta ${lead.businessName} — ${contactNames}`;

    const proposalResult = Proposal.create({
      title,
      leadId: input.leadId,
      ownerId: input.requesterId,
      status: "draft",
      agentStatus: "processing",
      agentTriggeredAt: new Date(),
    });
    if (proposalResult.isLeft()) return left(proposalResult.value);

    const proposal = proposalResult.value;
    await this.proposalsRepo.save(proposal);

    const baseUrl = this.config.get<string>("BASE_URL") ?? "http://localhost:3010";
    const webhookUrl = `${baseUrl}/webhooks/proposal-agent`;

    let jobId: string;
    try {
      const result = await this.agentPort.trigger({
        proposalId: proposal.id.toString(),
        leadId: input.leadId,
        requesterId: input.requesterId,
        brand: input.brand,
        contacts: input.contacts,
        instructions: input.instructions,
        lead: {
          businessName: lead.businessName,
          city: lead.city,
          state: lead.state,
          website: lead.website,
          description: lead.description,
          email: lead.email,
          phone: lead.phone,
          whatsapp: lead.whatsapp,
        },
        webhookUrl,
      });
      jobId = result.jobId;
    } catch (err) {
      proposal.update({ agentStatus: "error" });
      await this.proposalsRepo.save(proposal);
      return left(new Error(`Falha ao acionar o agente: ${String(err)}`));
    }

    proposal.update({ agentJobId: jobId, agentStatus: "processing" });
    await this.proposalsRepo.save(proposal);

    return right({ proposalId: proposal.id.toString(), jobId });
  }
}
