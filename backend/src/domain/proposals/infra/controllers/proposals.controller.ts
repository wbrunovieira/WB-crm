import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, NotFoundException, ForbiddenException, UnprocessableEntityException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Left } from "@/core/either";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { Proposal } from "../../enterprise/entities/proposal";
import {
  GetProposalsUseCase, GetProposalByIdUseCase,
  CreateProposalUseCase, UpdateProposalUseCase, DeleteProposalUseCase,
} from "../../application/use-cases/proposals.use-cases";
import { UploadProposalUseCase } from "../../application/use-cases/upload-proposal.use-case";
import { UpdateProposalWithFileUseCase } from "../../application/use-cases/update-proposal-with-file.use-case";
import { GoogleDrivePort } from "@/domain/integrations/whatsapp/application/ports/google-drive.port";

function serialize(p: Proposal) {
  return {
    id: p.id.toString(),
    title: p.title,
    description: p.description,
    status: p.status,
    driveFileId: p.driveFileId,
    driveUrl: p.driveUrl,
    fileName: p.fileName,
    fileSize: p.fileSize,
    sentAt: p.sentAt,
    leadId: p.leadId,
    dealId: p.dealId,
    ownerId: p.ownerId,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function handleError(err: Left<Error, unknown>): never {
  const e = err.value as Error;
  if (e.name === "ProposalNotFoundError") throw new NotFoundException(e.message);
  if (e.name === "ProposalForbiddenError") throw new ForbiddenException(e.message);
  throw new UnprocessableEntityException(e.message);
}

@ApiTags("proposals")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("proposals")
export class ProposalsController {
  constructor(
    private readonly getProposals: GetProposalsUseCase,
    private readonly getProposalById: GetProposalByIdUseCase,
    private readonly createProposal: CreateProposalUseCase,
    private readonly updateProposal: UpdateProposalUseCase,
    private readonly deleteProposal: DeleteProposalUseCase,
    private readonly uploadProposal: UploadProposalUseCase,
    private readonly updateWithFile: UpdateProposalWithFileUseCase,
    private readonly drive: GoogleDrivePort,
  ) {}

  @Get()
  async list(
    @Query("leadId") leadId: string | undefined,
    @Query("dealId") dealId: string | undefined,
    @Query("status") status: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const r = await this.getProposals.execute({ requesterId: user.id, filters: { leadId, dealId, status } });
    if (r.isLeft()) handleError(r);
    return r.unwrap().map(serialize);
  }

  @Get(":id")
  async getOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.getProposalById.execute({ id, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) handleError(r);
    return serialize(r.unwrap());
  }

  @Post()
  async create(@Body() body: {
    title: string;
    description?: string;
    status?: string;
    driveFileId?: string;
    driveUrl?: string;
    fileName?: string;
    fileMimeType?: string;
    fileBase64?: string;
    fileSize?: number;
    leadId?: string;
    dealId?: string;
  }, @CurrentUser() user: AuthenticatedUser) {
    if (body.fileBase64 && body.fileName && body.fileMimeType) {
      const r = await this.uploadProposal.execute({
        title: body.title,
        description: body.description,
        leadId: body.leadId,
        dealId: body.dealId,
        fileName: body.fileName,
        fileMimeType: body.fileMimeType,
        fileBase64: body.fileBase64,
        ownerId: user.id,
      });
      if (r.isLeft()) handleError(r);
      return serialize(r.unwrap());
    }

    const r = await this.createProposal.execute({ ...body, ownerId: user.id });
    if (r.isLeft()) handleError(r);
    return serialize(r.unwrap());
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: {
    title?: string;
    description?: string;
    status?: string;
    driveFileId?: string;
    driveUrl?: string;
    fileName?: string;
    fileMimeType?: string;
    fileBase64?: string;
    fileSize?: number;
    leadId?: string;
    dealId?: string;
  }, @CurrentUser() user: AuthenticatedUser) {
    if (body.fileBase64 && body.fileName && body.fileMimeType) {
      const r = await this.updateWithFile.execute({
        id, requesterId: user.id, requesterRole: user.role ?? "sdr",
        title: body.title, description: body.description, status: body.status,
        leadId: body.leadId, dealId: body.dealId,
        fileName: body.fileName, fileMimeType: body.fileMimeType, fileBase64: body.fileBase64,
      });
      if (r.isLeft()) handleError(r);
      return serialize(r.unwrap());
    }

    const r = await this.updateProposal.execute({ id, ...body, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) handleError(r);
    return serialize(r.unwrap());
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const found = await this.getProposalById.execute({ id, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    const driveFileId = found.isRight() ? found.value.driveFileId : null;

    const r = await this.deleteProposal.execute({ id, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) handleError(r);

    if (driveFileId) {
      this.drive.deleteFile(driveFileId).catch(() => { /* arquivo pode já ter sido removido */ });
    }
  }
}
