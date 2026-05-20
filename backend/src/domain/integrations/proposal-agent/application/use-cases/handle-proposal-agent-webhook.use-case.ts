import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { ProposalsRepository } from "@/domain/proposals/application/repositories/proposals.repository";

export type ProposalAgentWebhookPayload = {
  jobId: string;
  proposalId?: string;
  status: "question" | "completed" | "error";
  question?: string;
  driveFileId?: string;
  driveUrl?: string;
  fileName?: string;
  fileSize?: number;
  errorMessage?: string;
};

type Output = Either<Error, { proposalId: string; status: string }>;

@Injectable()
export class HandleProposalAgentWebhookUseCase {
  constructor(private readonly proposalsRepo: ProposalsRepository) {}

  async execute(payload: ProposalAgentWebhookPayload): Promise<Output> {
    const proposal = payload.proposalId
      ? await this.proposalsRepo.findById(payload.proposalId)
      : await this.proposalsRepo.findByAgentJobId(payload.jobId);

    if (!proposal) return left(new Error(`Proposta não encontrada para jobId=${payload.jobId}`));

    if (payload.status === "question") {
      proposal.update({
        agentStatus: "awaiting_answer",
        agentCurrentQuestion: payload.question ?? null,
      });
    } else if (payload.status === "completed") {
      proposal.update({
        agentStatus: "completed",
        agentCurrentQuestion: null,
        status: "draft",
        driveFileId: payload.driveFileId,
        driveUrl: payload.driveUrl,
        fileName: payload.fileName,
        fileSize: payload.fileSize,
      });
    } else if (payload.status === "error") {
      proposal.update({
        agentStatus: "error",
        agentCurrentQuestion: null,
      });
    }

    await this.proposalsRepo.save(proposal);
    return right({ proposalId: proposal.id.toString(), status: proposal.agentStatus ?? "unknown" });
  }
}
