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
  BadRequestException,
  Headers,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { TriggerGatekeeperAnalysisUseCase, ActivityNotFoundError } from "../../application/use-cases/trigger-gatekeeper-analysis.use-case";
import {
  HandleGatekeeperAnalysisWebhookUseCase,
  type GatekeeperAnalysisWebhookPayload,
} from "../../application/use-cases/handle-gatekeeper-analysis-webhook.use-case";
import {
  HandleGatekeeperBatchWebhookUseCase,
  type GatekeeperBatchWebhookPayload,
} from "../../application/use-cases/handle-gatekeeper-batch-webhook.use-case";
import { TriggerGatekeeperBatchUseCase } from "../../application/use-cases/trigger-gatekeeper-batch.use-case";
import {
  GetGatekeeperAnalysesUseCase,
  GetGatekeeperAnalysisByActivityUseCase,
  GetGatekeeperAnalysisByIdUseCase,
  GetGatekeeperBatchesUseCase,
  GetGatekeeperBatchByIdUseCase,
  GatekeeperNotFoundError,
} from "../../application/use-cases/query-gatekeeper.use-cases";
import type { GatekeeperAnalysis } from "../../enterprise/entities/gatekeeper-analysis.entity";
import type { GatekeeperBatch } from "../../enterprise/entities/gatekeeper-batch.entity";

// raport/diag fields are stored JSON-stringified by the webhook use case.
// Legacy or partially-written rows may hold plain strings — fall back to the
// raw value instead of throwing a 500 on JSON.parse.
function parseJson(value: string | null | undefined): unknown {
  if (!value) return null; // null/undefined/"" → null (parity with prior `x ? parse : null`)
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function serializeAnalysis(a: GatekeeperAnalysis) {
  return {
    id: a.id.toString(),
    activityId: a.activityId,
    ownerId: a.ownerId,
    score: a.score ?? null,
    summary: a.summary ?? null,
    status: a.status,
    errorMsg: a.errorMsg ?? null,
    jobId: a.jobId ?? null,
    raportRecepcao: parseJson(a.raportRecepcao),
    raportAlianca: parseJson(a.raportAlianca),
    raportPerguntas: parseJson(a.raportPerguntas),
    raportObjecoes: parseJson(a.raportObjecoes),
    raportResultado: parseJson(a.raportResultado),
    raportTecnicas: parseJson(a.raportTecnicas),
    positivePoints: parseJson(a.positivePoints),
    improvementPoints: parseJson(a.improvementPoints),
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

function serializeBatch(b: GatekeeperBatch) {
  return {
    id: b.id.toString(),
    ownerId: b.ownerId,
    status: b.status,
    jobId: b.jobId ?? null,
    errorMsg: b.errorMsg ?? null,
    analysisIds: parseJson(b.analysisIds),
    overallScore: b.overallScore ?? null,
    dimensionAverages: parseJson(b.dimensionAverages),
    patterns: parseJson(b.patterns),
    comparisonWithHistory: parseJson(b.comparisonWithHistory),
    individualHighlights: parseJson(b.individualHighlights),
    recommendations: parseJson(b.recommendations),
    newSummary: b.newSummary ?? null,
    positivePoints: parseJson(b.positivePoints),
    improvementPoints: parseJson(b.improvementPoints),
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
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
    ) return true;
  }

  return false;
}

@ApiTags("Gatekeeper Analysis")
@Controller()
export class GatekeeperAnalysisController {
  private readonly logger = new Logger(GatekeeperAnalysisController.name);

  constructor(
    private readonly triggerAnalysis: TriggerGatekeeperAnalysisUseCase,
    private readonly handleAnalysisWebhook: HandleGatekeeperAnalysisWebhookUseCase,
    private readonly triggerBatch: TriggerGatekeeperBatchUseCase,
    private readonly handleBatchWebhook: HandleGatekeeperBatchWebhookUseCase,
    private readonly getAnalyses: GetGatekeeperAnalysesUseCase,
    private readonly getAnalysisByActivity: GetGatekeeperAnalysisByActivityUseCase,
    private readonly getAnalysisById: GetGatekeeperAnalysisByIdUseCase,
    private readonly getBatches: GetGatekeeperBatchesUseCase,
    private readonly getBatchById: GetGatekeeperBatchByIdUseCase,
  ) {}

  @Post("gatekeeper-analysis/trigger-by-activity/:activityId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Dispara análise RAPORT de ligação gatekeeper pelo ID da atividade" })
  async triggerByActivity(
    @Param("activityId") activityId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const webhookUrl = `${process.env.BACKEND_PUBLIC_URL ?? "https://crm.wbdigitalsolutions.com"}/webhooks/gatekeeper-analysis`;

    const result = await this.triggerAnalysis.execute({
      activityId,
      ownerId: user.id,
      webhookUrl,
    });

    if (result.isLeft()) {
      if (result.value instanceof ActivityNotFoundError) throw new NotFoundException(result.value.message);
      throw new BadRequestException(result.value.message);
    }
    return { analysisId: result.value.analysisId };
  }

  @Post("gatekeeper-analysis/trigger-batch")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Dispara análise de lote de ligações gatekeeper" })
  async triggerBatchEndpoint(
    @Body() body: { analysisIds: string[] },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const webhookUrl = `${process.env.BACKEND_PUBLIC_URL ?? "https://crm.wbdigitalsolutions.com"}/webhooks/gatekeeper-batch`;

    const result = await this.triggerBatch.execute({
      ownerId: user.id,
      analysisIds: body.analysisIds,
      webhookUrl,
    });

    if (result.isLeft()) throw new BadRequestException(result.value.message);
    return { batchId: result.value.batchId };
  }

  @Post("webhooks/gatekeeper-analysis")
  @HttpCode(200)
  @ApiOperation({ summary: "Callback do agente com resultado da análise RAPORT individual" })
  async analysisWebhook(
    @Body() body: GatekeeperAnalysisWebhookPayload,
    @Headers() headers: Record<string, string | undefined>,
  ) {
    if (!isAuthorized(headers)) {
      this.logger.warn("Unauthorized webhook attempt for gatekeeper-analysis");
      throw new ForbiddenException("Unauthorized");
    }

    this.logger.log(`GK analysis webhook: jobId=${body.jobId} status=${body.status}`);

    const result = await this.handleAnalysisWebhook.execute(body);
    if (result.isLeft()) {
      this.logger.error(`GK analysis webhook error: ${result.value.message}`);
      throw new NotFoundException(result.value.message);
    }

    this.logger.log(`GatekeeperAnalysis updated: ${result.value.analysisId}`);
    return { ok: true, analysisId: result.value.analysisId };
  }

  @Post("webhooks/gatekeeper-batch")
  @HttpCode(200)
  @ApiOperation({ summary: "Callback do agente com resultado da análise de lote gatekeeper" })
  async batchWebhook(
    @Body() body: GatekeeperBatchWebhookPayload,
    @Headers() headers: Record<string, string | undefined>,
  ) {
    if (!isAuthorized(headers)) {
      this.logger.warn("Unauthorized webhook attempt for gatekeeper-batch");
      throw new ForbiddenException("Unauthorized");
    }

    this.logger.log(`GK batch webhook: batchJobId=${body.batchJobId} status=${body.status}`);

    setImmediate(() => {
      this.handleBatchWebhook.execute(body).then((result) => {
        if (result.isLeft()) this.logger.error(`GK batch webhook error: ${result.value.message}`);
        else this.logger.log(`GatekeeperBatch updated: ${result.value.batchId}`);
      }).catch((err: unknown) => {
        this.logger.error(`GK batch webhook exception: ${String(err)}`);
      });
    });

    return { ok: true, queued: true };
  }

  @Get("gatekeeper-analysis")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Lista análises RAPORT individuais do usuário" })
  async list(@CurrentUser() user: AuthenticatedUser) {
    const analyses = await this.getAnalyses.execute(user.id);
    return analyses.map(serializeAnalysis);
  }

  @Get("gatekeeper-analysis/by-activity/:activityId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Busca análise RAPORT pelo ID da atividade" })
  async getByActivity(
    @Param("activityId") activityId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.getAnalysisByActivity.execute({ activityId, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (result.isLeft()) {
      if (result.value instanceof GatekeeperNotFoundError) throw new NotFoundException(result.value.message);
      throw new ForbiddenException(result.value.message);
    }
    return serializeAnalysis(result.value);
  }

  @Get("gatekeeper-analysis/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Busca análise RAPORT pelo ID" })
  async getById(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.getAnalysisById.execute({ id, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (result.isLeft()) {
      if (result.value instanceof GatekeeperNotFoundError) throw new NotFoundException(result.value.message);
      throw new ForbiddenException(result.value.message);
    }
    return serializeAnalysis(result.value);
  }

  @Get("gatekeeper-batches")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Lista lotes de análise gatekeeper do usuário" })
  async listBatches(@CurrentUser() user: AuthenticatedUser) {
    const batches = await this.getBatches.execute(user.id);
    return batches.map(serializeBatch);
  }

  @Get("gatekeeper-batches/:id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Busca lote de análise gatekeeper pelo ID" })
  async getBatch(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.getBatchById.execute({ id, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (result.isLeft()) {
      if (result.value instanceof GatekeeperNotFoundError) throw new NotFoundException(result.value.message);
      throw new ForbiddenException(result.value.message);
    }
    return serializeBatch(result.value);
  }
}
