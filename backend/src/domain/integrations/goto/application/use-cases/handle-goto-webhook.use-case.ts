import { Injectable, Logger } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { GoToApiPort } from "@/domain/integrations/goto/application/ports/goto-api.port";
import { GoToTokenPort } from "@/domain/integrations/goto/application/ports/goto-token.port";
import { CreateCallActivityUseCase } from "./create-call-activity.use-case";

export interface HandleGotoWebhookInput {
  eventType: string;
  conversationSpaceId?: string;
  rawPayload: unknown;
  ownerId: string;
}

export interface HandleGotoWebhookOutput {
  ignored?: boolean;
  activityId?: string;
}

@Injectable()
export class HandleGotoWebhookUseCase {
  private readonly logger = new Logger(HandleGotoWebhookUseCase.name);

  constructor(
    private readonly goToApi: GoToApiPort,
    private readonly goToToken: GoToTokenPort,
    private readonly createCallActivity: CreateCallActivityUseCase,
  ) {}

  async execute(
    input: HandleGotoWebhookInput,
  ): Promise<Either<never, HandleGotoWebhookOutput>> {
    const { eventType, conversationSpaceId, ownerId } = input;

    // Only process REPORT_SUMMARY events
    if (eventType !== "REPORT_SUMMARY") {
      this.logger.debug(`Ignoring event: ${eventType}`);
      return right({ ignored: true });
    }

    if (!conversationSpaceId) {
      this.logger.warn("REPORT_SUMMARY missing conversationSpaceId");
      return right({ ignored: true });
    }

    try {
      // Get valid access token
      const accessToken = await this.goToToken.getValidAccessToken();

      // Fetch full call report
      const report = await this.goToApi.fetchCallReport(conversationSpaceId, accessToken);
      if (!report) {
        this.logger.warn("Failed to fetch call report", { conversationSpaceId });
        return right({ ignored: true });
      }

      // Delegate to CreateCallActivityUseCase
      const result = await this.createCallActivity.execute({ report, ownerId });

      if (result.isLeft()) {
        this.logger.error("Failed to create call activity", {
          conversationSpaceId,
          error: result.value.message,
        });
        return right({ ignored: true });
      }

      return right({ activityId: result.value.activityId });
    } catch (err) {
      // Never return error from webhook — log and return success
      this.logger.error("Error processing GoTo webhook", {
        conversationSpaceId,
        error: err instanceof Error ? err.message : String(err),
      });
      return right({ ignored: true });
    }
  }
}
