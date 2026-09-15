import { Injectable, Logger } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { Proposal } from "../../enterprise/entities/proposal";
import { ProposalsRepository } from "../repositories/proposals.repository";
import { GoogleDrivePort } from "@/domain/integrations/whatsapp/application/ports/google-drive.port";
import { LeadsRepository } from "@/domain/leads/application/repositories/leads.repository";
import { PartnerOwnershipValidator } from "@/domain/partners/application/services/partner-ownership.validator";

export interface UploadProposalInput {
  title: string;
  description?: string;
  leadId?: string;
  dealId?: string;
  partnerId?: string;
  organizationId?: string;
  fileName?: string;
  fileMimeType?: string;
  fileBase64?: string;
  ownerId: string;
  requesterRole?: string;
}

@Injectable()
export class UploadProposalUseCase {
  private readonly logger = new Logger(UploadProposalUseCase.name);

  constructor(
    private readonly repo: ProposalsRepository,
    private readonly drive: GoogleDrivePort,
    private readonly leads: LeadsRepository,
    private readonly partnerOwnership: PartnerOwnershipValidator,
  ) {}

  async execute(input: UploadProposalInput): Promise<Either<Error, Proposal>> {
    const partnerCheck = await this.partnerOwnership.assertAccessible(
      input.partnerId,
      input.ownerId,
      input.requesterRole ?? "sdr",
    );
    if (partnerCheck.isLeft()) return left(partnerCheck.value);

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
      organizationId: input.organizationId,
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

    // Verifica em vez de confiar. O id guardado pode apontar para pasta APAGADA — foi o que
    // aconteceu com a HMenezes em 15/09/2026: a pasta sumiu do Drive, o lead seguiu apontando
    // para ela, e TODO upload daquele lead passou a falhar. Sem esta checagem o lead fica
    // quebrado para sempre, porque o id morto nunca e revisto.
    if (lead?.driveFolderId) {
      if (await this.drive.folderExists(lead.driveFolderId)) return lead.driveFolderId;
      this.logger.warn(
        `Pasta ${lead.driveFolderId} do lead ${leadId} nao existe mais no Drive — recriando.`,
      );
    }

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
