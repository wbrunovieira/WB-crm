import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  HttpCode,
  Logger,
  UnauthorizedException,
  Delete,
  Param,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { Request } from "express";
import { HandleGotoWebhookUseCase } from "@/domain/integrations/goto/application/use-cases/handle-goto-webhook.use-case";
import { SyncGotoCallReportsUseCase } from "@/domain/integrations/goto/application/use-cases/sync-goto-call-reports.use-case";
import { GoToRecordingCronService } from "@/domain/integrations/goto/infra/scheduled/goto-recording-cron.service";
import { GotoActivityCreatedEvent } from "@/domain/integrations/goto/enterprise/events/goto-activity-created.event";
import { GoToTokenPort } from "@/domain/integrations/goto/application/ports/goto-token.port";

interface GoToWebhookPayload {
  eventType?: string;
  reportSummary?: {
    conversationSpaceId: string;
    accountKey: string;
    callCreated: string;
    callEnded: string;
  };
  callEvent?: {
    metadata: {
      conversationSpaceId: string;
    };
  };
}

@ApiTags("Webhooks")
@Controller("webhooks/goto")
export class GoToWebhookController {
  private readonly logger = new Logger(GoToWebhookController.name);

  constructor(
    private readonly handleGotoWebhook: HandleGotoWebhookUseCase,
    private readonly syncCallReports: SyncGotoCallReportsUseCase,
    private readonly recordingCron: GoToRecordingCronService,
    private readonly eventEmitter: EventEmitter2,
    private readonly goToToken: GoToTokenPort,
  ) {}

  @Post("calls")
  @HttpCode(200)
  @ApiOperation({ summary: "GoTo call webhook (public) — validates ?secret= query param" })
  async handleCallWebhook(
    @Query("secret") secret: string,
    @Body() body: GoToWebhookPayload | undefined,
    @Req() req: Request,
  ): Promise<{ ok: boolean; activityId?: string }> {
    // 1. Validate secret
    const expectedSecret = process.env.GOTO_WEBHOOK_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      this.logger.warn("GoTo webhook: invalid or missing secret");
      throw new UnauthorizedException("Invalid webhook secret");
    }

    // 2. Handle GoTo ping (empty body + GoTo user-agent)
    const userAgent = req.headers["user-agent"] ?? "";
    const isEmptyBody = !body || Object.keys(body).length === 0;
    if (isEmptyBody && userAgent.includes("GoTo Notifications")) {
      this.logger.log("GoTo webhook: ping responded");
      return { ok: true };
    }

    // 3. Get owner ID from env
    const ownerId = process.env.GOTO_DEFAULT_OWNER_ID ?? "";

    // 4. Extract conversationSpaceId from payload
    const eventType = body?.eventType ?? "";
    this.logger.log(`GoTo webhook event: ${eventType || "(no type)"}`, {
      conversationSpaceId: body?.reportSummary?.conversationSpaceId ?? body?.callEvent?.metadata?.conversationSpaceId,
    });
    const conversationSpaceId =
      body?.reportSummary?.conversationSpaceId ??
      body?.callEvent?.metadata?.conversationSpaceId;

    // 5. Delegate to use case — never returns error
    try {
      const result = await this.handleGotoWebhook.execute({
        eventType,
        conversationSpaceId,
        rawPayload: body,
        ownerId,
      });

      if (result.isRight() && result.value.activityId) {
        this.eventEmitter.emit(
          "goto.activity.created",
          new GotoActivityCreatedEvent(result.value.activityId),
        );
        return { ok: true, activityId: result.value.activityId };
      }
    } catch (err) {
      // Never return 500 from webhook — GoTo might retry and create loops
      this.logger.error("GoTo webhook unhandled error", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return { ok: true };
  }

  @Post("process-recordings")
  @HttpCode(200)
  @ApiOperation({ summary: "Manually trigger recording processing cron (internal)" })
  async triggerProcessRecordings(
    @Query("secret") secret: string,
  ): Promise<{ ok: boolean }> {
    const expectedSecret = process.env.GOTO_WEBHOOK_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      throw new UnauthorizedException("Invalid webhook secret");
    }
    await this.recordingCron.processRecordings();
    return { ok: true };
  }

  @Post("sync")
  @HttpCode(200)
  @ApiOperation({ summary: "Manual GoTo call report sync (internal)" })
  async syncReports(@Query("secret") secret: string): Promise<{ ok: boolean; fetched: number; created: number; skipped: number }> {
    const expectedSecret = process.env.GOTO_WEBHOOK_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      throw new UnauthorizedException("Invalid webhook secret");
    }
    const ownerId = process.env.GOTO_DEFAULT_OWNER_ID ?? "";
    const result = await this.syncCallReports.execute({ ownerId });
    return { ok: true, ...result.value };
  }

  @Get("subscriptions")
  @ApiOperation({ summary: "Lista webhook subscriptions ativas no GoTo" })
  async listSubscriptions(@Query("secret") secret: string) {
    const expectedSecret = process.env.GOTO_WEBHOOK_SECRET;
    if (!expectedSecret || secret !== expectedSecret) throw new UnauthorizedException("Invalid secret");

    const token = await this.goToToken.getValidAccessToken();
    const res = await fetch("https://api.goto.com/call-events/v1/subscriptions", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data;
  }

  @Post("subscriptions/register")
  @HttpCode(200)
  @ApiOperation({ summary: "Registra webhook subscription de call-events no GoTo" })
  async registerSubscription(@Query("secret") secret: string) {
    const expectedSecret = process.env.GOTO_WEBHOOK_SECRET;
    if (!expectedSecret || secret !== expectedSecret) throw new UnauthorizedException("Invalid secret");

    const token = await this.goToToken.getValidAccessToken();
    const accountKey = process.env.GOTO_ACCOUNT_KEY;
    const webhookUrl = `${process.env.BACKEND_URL ?? "https://crm.wbdigitalsolutions.com"}/webhooks/goto/calls`;
    const webhookSecret = process.env.GOTO_WEBHOOK_SECRET ?? "";

    this.logger.log(`Registering GoTo webhook subscription → ${webhookUrl}`);

    const res = await fetch("https://api.goto.com/call-events/v1/subscriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        callEvents: ["CALL_ENDED"],
        url: webhookUrl,
        secret: webhookSecret,
        ...(accountKey ? { accountKey } : {}),
      }),
    });

    const data = await res.json();
    this.logger.log(`GoTo subscription result: ${JSON.stringify(data)}`);
    return { status: res.status, data };
  }

  @Delete("subscriptions/:subscriptionId")
  @HttpCode(200)
  @ApiOperation({ summary: "Remove webhook subscription do GoTo" })
  async deleteSubscription(
    @Param("subscriptionId") subscriptionId: string,
    @Query("secret") secret: string,
  ) {
    const expectedSecret = process.env.GOTO_WEBHOOK_SECRET;
    if (!expectedSecret || secret !== expectedSecret) throw new UnauthorizedException("Invalid secret");

    const token = await this.goToToken.getValidAccessToken();
    const res = await fetch(`https://api.goto.com/call-events/v1/subscriptions/${subscriptionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    return { status: res.status, ok: res.ok };
  }
}
