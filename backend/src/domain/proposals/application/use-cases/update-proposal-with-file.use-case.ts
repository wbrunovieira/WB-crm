import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { Proposal } from "../../enterprise/entities/proposal";
import { ProposalsRepository } from "../repositories/proposals.repository";
import { ProposalNotFoundError, ProposalForbiddenError } from "./proposals.use-cases";
import { GoogleDrivePort } from "@/domain/integrations/whatsapp/application/ports/google-drive.port";
import { PrismaService } from "@/infra/database/prisma.service";

export interface UpdateProposalWithFileInput {
  id: string;
  requesterId: string;
  requesterRole: string;
  title?: string;
  description?: string;
  status?: string;
  leadId?: string;
  dealId?: string;
  fileName?: string;
  fileMimeType?: string;
  fileBase64?: string;
}

@Injectable()
export class UpdateProposalWithFileUseCase {
  constructor(
    private readonly repo: ProposalsRepository,
    private readonly drive: GoogleDrivePort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: UpdateProposalWithFileInput): Promise<Either<Error, Proposal>> {
    const proposal = await this.repo.findById(input.id);
    if (!proposal) return left(new ProposalNotFoundError("Proposta não encontrada"));
    if (input.requesterRole !== "admin" && proposal.ownerId !== input.requesterId) {
      return left(new ProposalForbiddenError("Acesso negado"));
    }

    let driveFileId = proposal.driveFileId;
    let driveUrl = proposal.driveUrl;
    let fileSize = proposal.fileSize;
    let fileName = input.fileName ?? proposal.fileName;

    if (input.fileBase64 && input.fileName && input.fileMimeType) {
      const content = Buffer.from(input.fileBase64, "base64");
      fileSize = content.length;

      let folderId: string | undefined;
      if (input.leadId) {
        folderId = await this.getOrCreateLeadFolder(input.leadId);
      }

      const uploaded = await this.drive.uploadFile({
        name: input.fileName,
        mimeType: input.fileMimeType,
        content,
        folderId,
      });

      if (driveFileId) {
        try { await this.drive.deleteFile(driveFileId); } catch { /* already gone */ }
      }

      driveFileId = uploaded.id;
      driveUrl = uploaded.webViewLink;
      fileName = input.fileName;
    }

    const updateResult = proposal.update({
      title: input.title,
      description: input.description,
      status: input.status,
      leadId: input.leadId,
      dealId: input.dealId,
      driveFileId: driveFileId ?? undefined,
      driveUrl: driveUrl ?? undefined,
      fileName: fileName ?? undefined,
      fileSize: fileSize ?? undefined,
    });

    if (updateResult.isLeft()) return left(updateResult.value);
    await this.repo.save(proposal);
    return right(proposal);
  }

  private async getOrCreateLeadFolder(leadId: string): Promise<string> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: { driveFolderId: true, businessName: true },
    });

    if (lead?.driveFolderId) return lead.driveFolderId;

    const rootId = await this.drive.getOrCreateFolder("WB-CRM", undefined);
    const proposalsId = await this.drive.getOrCreateFolder("Propostas", rootId);
    const folderId = await this.drive.getOrCreateFolder(lead?.businessName ?? leadId, proposalsId);

    await this.prisma.lead.update({ where: { id: leadId }, data: { driveFolderId: folderId } });
    return folderId;
  }
}
