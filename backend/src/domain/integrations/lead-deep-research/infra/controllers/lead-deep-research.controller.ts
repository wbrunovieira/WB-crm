import {
  Controller,
  Post,
  Body,
  Param,
  Headers,
  HttpCode,
  Logger,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  BadGatewayException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { RequestLeadDeepResearchUseCase } from "../../application/use-cases/request-lead-deep-research.use-case";
import { HandleLeadDeepResearchWebhookUseCase, type LeadDeepResearchWebhookPayload } from "../../application/use-cases/handle-lead-deep-research-webhook.use-case";

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

    const result = await this.handleWebhook.execute(body);

    if (result.isLeft()) {
      this.logger.error(`Webhook processing error: ${result.value.message}`);
      return { ok: false, error: result.value.message };
    }

    const { updatedFields, newContactsCount } = result.value;
    this.logger.log(`Lead ${body.leadId} updated: fields=${updatedFields.join(",") || "none"} contacts=${newContactsCount}`);

    return { ok: true, updatedFields, newContactsCount };
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
