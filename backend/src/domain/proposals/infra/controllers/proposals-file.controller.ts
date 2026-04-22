import {
  Controller, Get, Param, Query, UseGuards,
  NotFoundException, ForbiddenException, StreamableFile,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { SseJwtAuthGuard } from "@/infra/auth/guards/sse-jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { GetProposalByIdUseCase } from "../../application/use-cases/proposals.use-cases";
import { GoogleDriveDownloadService } from "@/infra/shared/google-drive-download/google-drive-download.service";

// Dedicated controller for Drive file streaming — uses SseJwtAuthGuard so browsers can
// authenticate via ?token= query param (anchor href cannot send custom headers).
@ApiTags("proposals")
@ApiBearerAuth()
@UseGuards(SseJwtAuthGuard)
@Controller("proposals")
export class ProposalsFileController {
  constructor(
    private readonly getProposalById: GetProposalByIdUseCase,
    private readonly driveDownload: GoogleDriveDownloadService,
  ) {}

  @Get(":id/file")
  async downloadFile(
    @Param("id") id: string,
    @Query("inline") inline: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StreamableFile> {
    const r = await this.getProposalById.execute({ id, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) throw new NotFoundException("Proposta não encontrada");
    const proposal = r.unwrap();

    if (!proposal.driveFileId) throw new NotFoundException("Arquivo não disponível");

    const { buffer, mimeType, fileName } = await this.driveDownload.downloadFileWithMeta(proposal.driveFileId);
    const name = proposal.fileName ?? fileName;
    const disposition = inline === "true"
      ? `inline; filename="${encodeURIComponent(name)}"`
      : `attachment; filename="${encodeURIComponent(name)}"`;

    return new StreamableFile(buffer, { type: mimeType, disposition, length: buffer.length });
  }
}
