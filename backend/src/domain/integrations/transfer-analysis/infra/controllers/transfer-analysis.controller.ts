import {
  Controller,
  Post,
  Param,
  UseGuards,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { TriggerTransferAnalysisUseCase } from "../../application/use-cases/trigger-transfer-analysis.use-case";

@ApiTags("Transfer Analysis")
@Controller()
export class TransferAnalysisController {
  private readonly logger = new Logger(TransferAnalysisController.name);

  constructor(
    private readonly triggerTransfer: TriggerTransferAnalysisUseCase,
  ) {}

  @Post("transfer-analysis/trigger-by-activity/:activityId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Dispara análise de transferência (RAPORT + SPICED) por atividade" })
  async triggerByActivity(
    @Param("activityId") activityId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const base = process.env.BACKEND_PUBLIC_URL ?? "https://crm.wbdigitalsolutions.com";

    const result = await this.triggerTransfer.execute({
      activityId,
      ownerId: user.id,
      gkWebhookUrl: `${base}/webhooks/gatekeeper-analysis`,
      spicedWebhookUrl: `${base}/webhooks/call-analysis`,
    });

    if (result.isLeft()) {
      const msg = result.value.message;
      if (msg.includes("não encontrada")) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
    return { gkAnalysisId: result.value.gkAnalysisId, spicedAnalysisId: result.value.spicedAnalysisId };
  }
}
