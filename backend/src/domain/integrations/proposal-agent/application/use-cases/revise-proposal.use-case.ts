import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { ProposalsRepository } from "@/domain/proposals/application/repositories/proposals.repository";
import { LeadsRepository } from "@/domain/leads/application/repositories/leads.repository";
import { Proposal } from "@/domain/proposals/enterprise/entities/proposal";
import { ProposalAgentPort } from "../ports/proposal-agent.port";

export type ReviseProposalInput = {
  proposalId: string;
  requesterId: string;
  requesterRole: string;
  revisionNotes: string;
};

type Output = Either<Error, { proposalId: string; jobId: string; revisionNumber: number }>;

@Injectable()
export class ReviseProposalUseCase {
  constructor(
    private readonly proposalsRepo: ProposalsRepository,
    private readonly leadsRepo: LeadsRepository,
    private readonly agentPort: ProposalAgentPort,
  ) {}

  async execute(input: ReviseProposalInput): Promise<Output> {
    const original = await this.proposalsRepo.findById(input.proposalId);
    if (!original) return left(new Error("Proposta não encontrada"));

    if (!original.driveUrl) return left(new Error("Proposta não possui arquivo no Drive. Gere a proposta antes de revisá-la."));

    const lead = original.leadId
      ? await this.leadsRepo.findById(original.leadId, input.requesterId, input.requesterRole)
      : null;

    const nextRevisionNumber = (original.revisionNumber ?? 0) + 1;
    const revTag = `REV${nextRevisionNumber}`;
    const baseTitle = original.originalProposalId
      ? original.title.replace(/\s*REV\d+$/, "")
      : original.title;
    const newTitle = `${baseTitle} ${revTag}`;

    const revisionResult = Proposal.create({
      title: newTitle,
      leadId: original.leadId,
      dealId: original.dealId,
      ownerId: original.ownerId,
      status: "draft",
      agentStatus: "processing",
      agentTriggeredAt: new Date(),
      revisionNumber: nextRevisionNumber,
      originalProposalId: original.originalProposalId ?? original.id.toString(),
    });
    if (revisionResult.isLeft()) return left(revisionResult.value);
    const revision = revisionResult.value;
    await this.proposalsRepo.save(revision);

    const baseUrl = process.env.BACKEND_PUBLIC_URL ?? "https://crm.wbdigitalsolutions.com";
    const webhookUrl = `${baseUrl}/webhooks/proposal-agent`;

    let jobId: string;
    try {
      const result = await this.agentPort.revise({
        proposalId: revision.id.toString(),
        revisionNumber: nextRevisionNumber,
        driveUrl: original.driveUrl,
        revisionNotes: input.revisionNotes,
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
      revision.update({ agentStatus: "error" });
      await this.proposalsRepo.save(revision);
      return left(new Error(`Falha ao acionar o agente de revisão: ${String(err)}`));
    }

    revision.update({ agentJobId: jobId, agentStatus: "processing" });
    await this.proposalsRepo.save(revision);

    return right({ proposalId: revision.id.toString(), jobId, revisionNumber: nextRevisionNumber });
  }
}
