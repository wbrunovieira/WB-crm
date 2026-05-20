import { Injectable, Logger } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { ProposalsRepository } from "@/domain/proposals/application/repositories/proposals.repository";
import { GoogleDrivePort } from "@/domain/integrations/whatsapp/application/ports/google-drive.port";

export type ProposalAgentWebhookPayload = {
  jobId: string;
  proposalId?: string;
  status: "question" | "completed" | "error";
  question?: string;
  // campos enviados pelo agente quando ele já tem o arquivo no Drive
  driveFileId?: string;
  driveUrl?: string;
  // campos enviados quando o agente delega o upload ao CRM
  fileBase64?: string;
  fileName?: string;
  fileSize?: number;
  errorMessage?: string;
};

type Output = Either<Error, { proposalId: string; status: string }>;

@Injectable()
export class HandleProposalAgentWebhookUseCase {
  private readonly logger = new Logger(HandleProposalAgentWebhookUseCase.name);

  constructor(
    private readonly proposalsRepo: ProposalsRepository,
    private readonly drive: GoogleDrivePort,
  ) {}

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
      let driveFileId = payload.driveFileId;
      let driveUrl = payload.driveUrl;
      let fileName = payload.fileName;
      let fileSize = payload.fileSize;

      if (payload.fileBase64 && payload.fileName) {
        try {
          const buffer = Buffer.from(payload.fileBase64, "base64");
          const folderName = process.env.PROPOSAL_DRIVE_FOLDER ?? "Propostas CRM";
          const folderId = await this.drive.getOrCreateFolder(folderName);
          const uploaded = await this.drive.uploadFile({
            name: payload.fileName,
            mimeType: "application/pdf",
            content: buffer,
            folderId,
          });
          driveFileId = uploaded.id;
          driveUrl = uploaded.webViewLink;
          fileName = payload.fileName;
          fileSize = buffer.byteLength;
          this.logger.log(`Proposal ${proposal.id}: uploaded to Drive as ${uploaded.id}`);
        } catch (err) {
          this.logger.error(`Proposal ${proposal.id}: Drive upload failed — ${String(err)}`);
        }
      }

      proposal.update({
        agentStatus: "completed",
        agentCurrentQuestion: null,
        status: "draft",
        driveFileId,
        driveUrl,
        fileName,
        fileSize,
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
