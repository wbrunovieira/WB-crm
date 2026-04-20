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

function isLocalIp(ip: string): boolean {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "localhost" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("172.17.") ||
    ip.startsWith("172.18.") ||
    ip.startsWith("172.19.") ||
    ip.startsWith("172.2") ||
    ip.startsWith("172.30.") ||
    ip.startsWith("172.31.")
  );
}

@Controller("webhooks/lead-research")
export class LeadResearchWebhookController {
  private readonly logger = new Logger(LeadResearchWebhookController.name);

  constructor(private readonly createNotification: CreateLeadResearchNotificationUseCase) {}

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

    const realIp = headers["x-real-ip"];
    if (realIp && isLocalIp(realIp)) return true;

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
