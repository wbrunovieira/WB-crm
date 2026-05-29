import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  NotFoundException,
  BadRequestException,
  BadGatewayException,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { VerifyLeadMetaAdsUseCase } from "../../application/use-cases/verify-lead-meta-ads.use-case";
import { BatchVerifyLeadMetaAdsUseCase } from "../../application/use-cases/batch-verify-lead-meta-ads.use-case";
import { LeadsRepository } from "@/domain/leads/application/repositories/leads.repository";

@ApiTags("Meta Ads")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("meta-ads")
export class MetaAdsController {
  constructor(
    private readonly verifyLeadMetaAds: VerifyLeadMetaAdsUseCase,
    private readonly batchVerifyLeadMetaAds: BatchVerifyLeadMetaAdsUseCase,
    private readonly leadsRepo: LeadsRepository,
  ) {}

  @Get("source-groups")
  @ApiOperation({ summary: "Lista sourceGroups com leads que têm Instagram" })
  async listSourceGroups(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ sourceGroups: string[] }> {
    const groups = await this.leadsRepo.findDistinctSourceGroups(user.id, user.role ?? "sdr");
    return { sourceGroups: groups };
  }

  @Post("verify/lead/batch")
  @HttpCode(200)
  @ApiOperation({ summary: "Verificar anúncios Meta em lote por sourceGroup (SSE)" })
  async batchVerifyHandler(
    @Body() body: { sourceGroup: string },
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    if (!body.sourceGroup) {
      throw new BadRequestException("Missing required field: sourceGroup");
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const result = await this.batchVerifyLeadMetaAds.execute({
      sourceGroup: body.sourceGroup,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
      onProgress: (progress) => {
        res.write(`data: ${JSON.stringify({ type: "progress", ...progress })}\n\n`);
      },
    });

    if (result.isLeft()) {
      res.write(`data: ${JSON.stringify({ type: "error", message: result.value.message })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ type: "done", ...result.value })}\n\n`);
    }
    res.end();
  }

  @Post("verify/lead/:id")
  @HttpCode(200)
  @ApiOperation({ summary: "Verificar anúncios Meta de um lead específico" })
  async verifyLeadHandler(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.verifyLeadMetaAds.execute({
      leadId: id,
      requesterId: user.id,
    });

    if (result.isLeft()) {
      const msg = result.value.message;
      if (msg.includes("não encontrado")) throw new NotFoundException(msg);
      if (msg.includes("não possui Instagram") || msg.includes("inválido")) throw new BadRequestException(msg);
      throw new BadGatewayException(msg);
    }

    return { ok: true, ...result.value };
  }
}
