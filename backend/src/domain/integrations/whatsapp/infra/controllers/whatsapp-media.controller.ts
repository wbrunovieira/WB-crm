import {
  Controller, Get, Param, Query, UseGuards,
  NotFoundException, ForbiddenException, StreamableFile,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { SseJwtAuthGuard } from "@/infra/auth/guards/sse-jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { GetWhatsAppMessageByIdUseCase } from "../../application/use-cases/get-whatsapp-message-by-id.use-case";
import { GoogleDriveDownloadService } from "@/infra/shared/google-drive-download/google-drive-download.service";

// Dedicated controller for binary streaming — uses SseJwtAuthGuard so browsers can
// authenticate via ?token= query param (img/audio src and anchor href cannot send headers).
@ApiTags("WhatsApp")
@ApiBearerAuth()
@UseGuards(SseJwtAuthGuard)
@Controller("whatsapp")
export class WhatsAppMediaController {
  constructor(
    private readonly getMessageById: GetWhatsAppMessageByIdUseCase,
    private readonly driveDownload: GoogleDriveDownloadService,
  ) {}

  @Get("media/:messageId")
  async getMedia(
    @Param("messageId") messageId: string,
    @Query("inline") inline: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StreamableFile> {
    const result = await this.getMessageById.execute(messageId);
    if (result.isLeft()) throw new NotFoundException("Mensagem não encontrada");
    const msg = result.value;

    if (user.role !== "admin" && msg.ownerId !== user.id) {
      throw new ForbiddenException("Acesso negado");
    }
    if (!msg.mediaDriveId) throw new NotFoundException("Mídia não disponível");

    const { buffer, mimeType, fileName } = await this.driveDownload.downloadFileWithMeta(msg.mediaDriveId);
    const disposition = inline === "true"
      ? `inline; filename="${encodeURIComponent(fileName)}"`
      : `attachment; filename="${encodeURIComponent(fileName)}"`;

    return new StreamableFile(buffer, { type: mimeType, disposition, length: buffer.length });
  }
}
