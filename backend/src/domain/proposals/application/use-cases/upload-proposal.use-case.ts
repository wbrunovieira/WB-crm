import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { Proposal } from "../../enterprise/entities/proposal";
import { ProposalsRepository } from "../repositories/proposals.repository";
import { GoogleDrivePort } from "@/domain/integrations/whatsapp/application/ports/google-drive.port";
import { LeadsRepository } from "@/domain/leads/application/repositories/leads.repository";

export interface UploadProposalInput {
  title: string;
  description?: string;
  leadId?: string;
  dealId?: string;
  partnerId?: string;
  fileName?: string;
  fileMimeType?: string;
  fileBase64?: string;
  ownerId: string;
}

@Injectable()
export class UploadProposalUseCase {
  constructor(
    private readonly repo: ProposalsRepository,
    private readonly drive: GoogleDrivePort,
    private readonly leads: LeadsRepository,
  ) {}

  async execute(input: UploadProposalInput): Promise<Either<Error, Proposal>> {
    let driveFileId: string | undefined;
    let driveUrl: string | undefined;
    let fileSize: number | undefined;

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

      driveFileId = uploaded.id;
      driveUrl = uploaded.webViewLink;
    }

    const result = Proposal.create({
      title: input.title,
      description: input.description,
      leadId: input.leadId,
      dealId: input.dealId,
      partnerId: input.partnerId,
      ownerId: input.ownerId,
      status: "draft",
      driveFileId,
      driveUrl,
      fileName: input.fileName,
      fileSize,
    });

    if (result.isLeft()) return left(result.value);
    const proposal = result.value as Proposal;
    await this.repo.save(proposal);
    return right(proposal);
  }

  private async getOrCreateLeadFolder(leadId: string): Promise<string> {
    const lead = await this.leads.findDriveFolder(leadId);

    if (lead?.driveFolderId) return lead.driveFolderId;

    const rootId = await this.drive.getOrCreateFolder("WB-CRM", undefined);
    const proposalsId = await this.drive.getOrCreateFolder("Propostas", rootId);
    const folderId = await this.drive.getOrCreateFolder(
      lead?.businessName ?? leadId,
      proposalsId,
    );

    await this.leads.setDriveFolder(leadId, folderId);

    return folderId;
  }
}
