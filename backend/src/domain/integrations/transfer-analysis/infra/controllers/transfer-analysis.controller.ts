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
import { PrismaService } from "@/infra/database/prisma.service";
import { TriggerTransferAnalysisUseCase } from "../../application/use-cases/trigger-transfer-analysis.use-case";

@ApiTags("Transfer Analysis")
@Controller()
export class TransferAnalysisController {
  private readonly logger = new Logger(TransferAnalysisController.name);

  constructor(
    private readonly triggerTransfer: TriggerTransferAnalysisUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Post("transfer-analysis/trigger-by-activity/:activityId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Dispara análise de transferência (RAPORT + SPICED) por atividade" })
  async triggerByActivity(
    @Param("activityId") activityId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        lead: { select: { id: true, businessName: true, segment: true, city: true } },
        contact: { select: { name: true, role: true } },
      },
    });

    if (!activity) throw new NotFoundException("Atividade não encontrada");
    if (!activity.gotoTranscriptText) throw new BadRequestException("Atividade ainda não possui transcrição");

    const base = process.env.BACKEND_PUBLIC_URL ?? "https://crm.wbdigitalsolutions.com";

    const result = await this.triggerTransfer.execute({
      activityId,
      activitySubject: activity.subject,
      transcript: activity.gotoTranscriptText,
      callDurationSeconds: activity.gotoDuration ?? undefined,
      callDate: activity.dueDate ?? undefined,
      leadId: activity.lead?.id,
      leadBusinessName: activity.lead?.businessName,
      leadSegment: activity.lead?.segment ?? undefined,
      leadCity: activity.lead?.city ?? undefined,
      contactName: activity.contact?.name ?? undefined,
      contactRole: activity.contact?.role ?? undefined,
      ownerId: user.id,
      gkWebhookUrl: `${base}/webhooks/gatekeeper-analysis`,
      spicedWebhookUrl: `${base}/webhooks/call-analysis`,
    });

    if (result.isLeft()) throw new BadRequestException(result.value.message);
    return { gkAnalysisId: result.value.gkAnalysisId, spicedAnalysisId: result.value.spicedAnalysisId };
  }
}
