import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  Logger,
  ForbiddenException,
} from "@nestjs/common";
import {
  CreateLeadResearchNotificationUseCase,
} from "../../application/use-cases/create-lead-research-notification.use-case";
import type { LeadResearchPayload } from "../../application/use-cases/create-lead-research-notification.use-case";


@Controller("webhooks/lead-research")
export class LeadResearchWebhookController {
  private readonly logger = new Logger(LeadResearchWebhookController.name);

  constructor(private readonly createNotification: CreateLeadResearchNotificationUseCase) {}

  private isAuthorized(headers: Record<string, string | undefined>): boolean {
    const apiKey = headers["x-internal-api-key"];
    if (apiKey && apiKey === process.env.INTERNAL_API_KEY) return true;

    const webhookSecret = headers["x-webhook-secret"];
    if (webhookSecret && webhookSecret === process.env.WEBHOOK_SECRET) return true;

    // Autorização só por segredo. x-forwarded-for e x-real-ip são controlados pelo cliente —
    // o nginx faz append, então um "127.0.0.1" forjado passava sem segredo nenhum (bypass
    // explorável em produção). Nunca confiar em header de proxy.
    return false;
  }

  @Post()
  @HttpCode(200)
  async receive(
    @Body() body: LeadResearchPayload,
    @Headers() headers: Record<string, string | undefined>,
  ) {
    if (!this.isAuthorized(headers)) {
      this.logger.warn("Lead research webhook — unauthorized request");
      throw new ForbiddenException("Forbidden");
    }

    this.logger.log(
      `Lead research callback: jobId=${body.jobId} status=${body.status} leads=${body.createdLeads?.length ?? 0}`,
    );

    try {
      const result = await this.createNotification.execute(body);
      if (result) {
        this.logger.log(`Notification created: ${result.notificationId} for user ${result.userId}`);
      } else {
        this.logger.warn("No user found — notification not created");
      }
    } catch (err) {
      // Never 500 — prevents retry loops from the Agent
      this.logger.error("Error creating notification", err);
    }

    return { ok: true };
  }
}
