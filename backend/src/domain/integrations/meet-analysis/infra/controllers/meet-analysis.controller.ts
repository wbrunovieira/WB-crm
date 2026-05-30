import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  Logger,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  Headers,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { TriggerMeetAnalysisUseCase, MeetingNotFoundError } from "../../application/use-cases/trigger-meet-analysis.use-case";
import {
  HandleMeetAnalysisWebhookUseCase,
  type MeetAnalysisWebhookPayload,
} from "../../application/use-cases/handle-meet-analysis-webhook.use-case";
import { GetMeetAnalysisUseCase } from "../../application/use-cases/get-meet-analysis.use-case";
import { ListMeetAnalysesUseCase } from "../../application/use-cases/list-meet-analyses.use-case";
import type { MeetAnalysis } from "../../enterprise/entities/meet-analysis.entity";

// Diag fields are stored JSON-stringified by the webhook use case. Legacy or
// partially-written rows may hold plain strings — fall back to the raw value
// instead of throwing a 500 on JSON.parse.
function parseJson(value: string | null | undefined): unknown {
  if (!value) return null; // null/undefined/"" → null (parity with prior `x ? parse : null`)
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function serializeAnalysis(analysis: MeetAnalysis) {
  return {
    id: analysis.id.toString(),
    activityId: analysis.activityId,
    leadId: analysis.leadId ?? null,
    ownerId: analysis.ownerId,
    score: analysis.score ?? null,
    summary: analysis.summary ?? null,
    nextStep: analysis.nextStep ?? null,
    status: analysis.status,
    errorMsg: analysis.errorMsg ?? null,
    jobId: analysis.jobId ?? null,
    diagBusiness: parseJson(analysis.diagBusiness),
    diagGaps: parseJson(analysis.diagGaps),
    diagUrgency: parseJson(analysis.diagUrgency),
    diagDecisionPower: parseJson(analysis.diagDecisionPower),
    diagEngagement: parseJson(analysis.diagEngagement),
    diagClosing: parseJson(analysis.diagClosing),
    positivePoints: parseJson(analysis.positivePoints),
    improvementPoints: parseJson(analysis.improvementPoints),
    createdAt: analysis.createdAt,
    updatedAt: analysis.updatedAt,
  };
}

function isAuthorized(headers: Record<string, string | undefined>): boolean {
  const apiKey = headers["x-internal-api-key"];
  if (apiKey && apiKey === process.env.INTERNAL_API_KEY) return true;

  const webhookSecret = headers["x-webhook-secret"];
  if (webhookSecret && webhookSecret === process.env.WEBHOOK_SECRET) return true;

  const forwardedFor = headers["x-forwarded-for"];
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0].trim();
    if (
      firstIp === "127.0.0.1" ||
      firstIp === "::1" ||
      firstIp === "localhost" ||
      firstIp.startsWith("192.168.") ||
      firstIp.startsWith("10.") ||
      firstIp.startsWith("172.16.") ||
      firstIp.startsWith("172.17.") ||
      firstIp.startsWith("172.18.") ||
      firstIp.startsWith("172.19.") ||
      firstIp.startsWith("172.2") ||
      firstIp.startsWith("172.30.") ||
      firstIp.startsWith("172.31.")
    ) {
      return true;
    }
  }

  return false;
}

@ApiTags("Meet Analysis")
@Controller()
export class MeetAnalysisController {
  private readonly logger = new Logger(MeetAnalysisController.name);

  constructor(
    private readonly handleWebhook: HandleMeetAnalysisWebhookUseCase,
    private readonly getAnalysis: GetMeetAnalysisUseCase,
    private readonly listAnalyses: ListMeetAnalysesUseCase,
    private readonly triggerAnalysis: TriggerMeetAnalysisUseCase,
  ) {}

  @Post("meet-analysis/trigger-by-activity/:activityId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Dispara análise DIAG de uma reunião Meet pelo ID da atividade" })
  async triggerByActivity(
    @Param("activityId") activityId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const webhookUrl = `${process.env.BACKEND_PUBLIC_URL ?? "https://crm.wbdigitalsolutions.com"}/webhooks/meet-analysis`;

    const result = await this.triggerAnalysis.execute({
      activityId,
      ownerId: user.id,
      webhookUrl,
    });

    if (result.isLeft()) {
      if (result.value instanceof MeetingNotFoundError) throw new NotFoundException(result.value.message);
      throw new BadRequestException(result.value.message);
    }
    return { analysisId: result.value.analysisId };
  }

  @Post("webhooks/meet-analysis")
  @HttpCode(200)
  @ApiOperation({ summary: "Callback do agente com resultado da análise DIAG de reunião" })
  async webhook(
    @Body() body: MeetAnalysisWebhookPayload,
    @Headers() headers: Record<string, string | undefined>,
  ) {
    if (!isAuthorized(headers)) {
      this.logger.warn("Unauthorized webhook attempt for meet-analysis");
      throw new ForbiddenException("Unauthorized");
    }

    this.logger.log(`Webhook received: jobId=${body.jobId} status=${body.status}`);

    const result = await this.handleWebhook.execute(body);
    if (result.isLeft()) {
      this.logger.error(`Webhook processing error: ${result.value.message}`);
      throw new NotFoundException(result.value.message);
    }

    this.logger.log(`MeetAnalysis ${result.value.analysisId} updated to ${body.status}`);
    return { ok: true, analysisId: result.value.analysisId };
  }

  @Get("meet-analysis")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Lista análises DIAG de reunião do usuário" })
  async list(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.listAnalyses.execute({
      ownerId: user.id,
      ownerRole: user.role ?? "sdr",
    });
    if (result.isLeft()) return [];
    return result.value.analyses.map(serializeAnalysis);
  }

  @Get("meet-analysis/by-activity/:activityId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Busca análise DIAG pelo ID da atividade" })
  async getByActivity(
    @Param("activityId") activityId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.getAnalysis.execute({
      activityId,
      ownerId: user.id,
      ownerRole: user.role ?? "sdr",
    });

    if (result.isLeft()) {
      const msg = result.value.message;
      if (msg.includes("não encontrada")) throw new NotFoundException(msg);
      throw new ForbiddenException(msg);
    }

    return serializeAnalysis(result.value.analysis);
  }

  @Get("meet-analysis/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Busca análise DIAG pelo ID" })
  async getById(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.getAnalysis.execute({
      id,
      ownerId: user.id,
      ownerRole: user.role ?? "sdr",
    });

    if (result.isLeft()) {
      const msg = result.value.message;
      if (msg.includes("não encontrada")) throw new NotFoundException(msg);
      throw new ForbiddenException(msg);
    }

    return serializeAnalysis(result.value.analysis);
  }
}
