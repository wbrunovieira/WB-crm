import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Headers,
  HttpCode,
  Logger,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  BadGatewayException,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { RequestLeadDeepResearchUseCase } from "../../application/use-cases/request-lead-deep-research.use-case";
import { HandleLeadDeepResearchWebhookUseCase, type LeadDeepResearchWebhookPayload } from "../../application/use-cases/handle-lead-deep-research-webhook.use-case";
import { StartBulkLeadResearchUseCase } from "../../application/use-cases/start-bulk-lead-research.use-case";
import { GetActiveBulkResearchUseCase } from "../../application/use-cases/get-active-bulk-research.use-case";
import { BulkResearchSessionRepository } from "../../application/repositories/bulk-research-session.repository";

function isLocalIp(ip: string): boolean {
  return (
    ip === "127.0.0.1" || ip === "::1" || ip === "localhost" ||
    ip.startsWith("192.168.") || ip.startsWith("10.") ||
    ip.startsWith("172.16.") || ip.startsWith("172.17.") ||
    ip.startsWith("172.18.") || ip.startsWith("172.19.") ||
    ip.startsWith("172.2") || ip.startsWith("172.30.") || ip.startsWith("172.31.")
  );
}

@ApiTags("Lead Deep Research")
@Controller()
export class LeadDeepResearchController {
  private readonly logger = new Logger(LeadDeepResearchController.name);

  constructor(
    private readonly requestResearch: RequestLeadDeepResearchUseCase,
    private readonly handleWebhook: HandleLeadDeepResearchWebhookUseCase,
    private readonly startBulk: StartBulkLeadResearchUseCase,
    private readonly getActiveBulk: GetActiveBulkResearchUseCase,
    private readonly sessionRepo: BulkResearchSessionRepository,
  ) {}

  @Post("leads/:id/deep-research")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(202)
  @ApiOperation({ summary: "Solicita pesquisa aprofundada do lead via agente IA" })
  async request(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.requestResearch.execute({
      leadId: id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });

    if (result.isLeft()) {
      const msg = result.value.message;
      if (msg.includes("não encontrado")) throw new NotFoundException(msg);
      throw new BadGatewayException(msg);
    }

    return { status: "accepted", jobId: result.value.jobId };
  }

  @Post("webhooks/lead-deep-research")
  @HttpCode(200)
  @ApiOperation({ summary: "Callback do agente IA com resultado da pesquisa" })
  async webhook(
    @Body() body: LeadDeepResearchWebhookPayload,
    @Headers() headers: Record<string, string | undefined>,
  ) {
    if (!this.isAuthorized(headers)) {
      this.logger.warn("Unauthorized webhook attempt for lead-deep-research");
      throw new ForbiddenException("Unauthorized");
    }

    this.logger.log(`Webhook received: leadId=${body.leadId} jobId=${body.jobId} status=${body.status}`);

    // Acknowledge immediately so the agent doesn't time out waiting for DB processing
    setImmediate(() => {
      this.handleWebhook.execute(body).then((result) => {
        if (result.isLeft()) {
          this.logger.error(`Webhook processing error: ${result.value.message}`);
        } else {
          const { updatedFields, newContactsCount } = result.value;
          this.logger.log(`Lead ${body.leadId} updated: fields=${updatedFields.join(",") || "none"} contacts=${newContactsCount}`);
        }
      }).catch((err: unknown) => {
        this.logger.error(`Webhook processing exception: ${String(err)}`);
      });
    });

    return { ok: true, queued: true };
  }

  @Post("leads/bulk-deep-research")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(202)
  @ApiOperation({ summary: "Inicia pesquisa IA em lote sequencial" })
  async startBulkResearch(
    @Body() body: { leadIds: string[]; skipResearched?: boolean },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!body.leadIds?.length) throw new BadRequestException("leadIds é obrigatório");

    const result = await this.startBulk.execute({
      leadIds: body.leadIds,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
      skipResearched: body.skipResearched ?? true,
    });

    if (result.isLeft()) throw new BadRequestException(result.value.message);
    return { status: "accepted", ...result.value };
  }

  @Get("leads/bulk-deep-research/active")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Retorna sessão de pesquisa em lote ativa do usuário" })
  async getActiveBulkSession(@CurrentUser() user: AuthenticatedUser) {
    const session = await this.getActiveBulk.execute(user.id);
    return session ?? { active: false };
  }

  @Delete("leads/bulk-deep-research/active")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @ApiOperation({ summary: "Cancela sessão de pesquisa em lote ativa" })
  async cancelBulkSession(@CurrentUser() user: AuthenticatedUser) {
    await this.sessionRepo.cancelAllActiveForUser(user.id);
  }

  private isAuthorized(headers: Record<string, string | undefined>): boolean {
    const apiKey = headers["x-internal-api-key"];
    if (apiKey && apiKey === process.env.INTERNAL_API_KEY) return true;

    const webhookSecret = headers["x-webhook-secret"];
    if (webhookSecret && webhookSecret === process.env.WEBHOOK_SECRET) return true;

    const forwardedFor = headers["x-forwarded-for"];
    if (forwardedFor) {
      const firstIp = forwardedFor.split(",")[0].trim();
      if (isLocalIp(firstIp)) return true;
    }

    return false;
  }
}
