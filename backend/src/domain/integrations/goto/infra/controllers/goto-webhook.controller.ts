import {
  Controller,
  Post,
  Body,
  Query,
  Req,
  HttpCode,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import type { Request } from "express";
import { HandleGotoWebhookUseCase } from "@/domain/integrations/goto/application/use-cases/handle-goto-webhook.use-case";

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
}
