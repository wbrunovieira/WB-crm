import { Injectable, Logger } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { EmailTrackingRepository } from "../repositories/email-tracking.repository";
import { EmailTrackingToken } from "../../enterprise/value-objects/email-tracking-token.vo";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";
import { EmailEngagementReadPort, EmailEngagementContext } from "../ports/email-engagement-read.port";
import { CreateNotificationUseCase } from "@/domain/notifications/application/use-cases/notifications.use-cases";
import { notifyEmailEngagement } from "./email-engagement-notifier";

export interface TrackEmailClickInput {
  token: string;
  url: string;
  userAgent?: string;
  ip?: string;
}

export interface TrackEmailClickOutput {
  redirectUrl: string;
}

@Injectable()
export class TrackEmailClickUseCase {
  private readonly logger = new Logger(TrackEmailClickUseCase.name);

  constructor(
    private readonly emailTrackingRepo: EmailTrackingRepository,
    private readonly activitiesRepo: ActivitiesRepository,
    private readonly engagementRead: EmailEngagementReadPort,
    private readonly createNotification: CreateNotificationUseCase,
  ) {}

  async execute(input: TrackEmailClickInput): Promise<Either<Error, TrackEmailClickOutput>> {
    const { token, url, userAgent, ip } = input;

    // 1. Validate token format
    const tokenResult = EmailTrackingToken.create(token);
    if (tokenResult.isLeft()) {
      return left(tokenResult.value);
    }
    const validToken = tokenResult.value.value;

    // 2. Validate url
    if (!url || url.trim().length === 0) {
      return left(new Error("URL is required for click tracking"));
    }

    const redirectUrl = url.trim();

    // 3. Resolve engagement context (owner, recipient, campaign flag). Best-effort.
    let context: EmailEngagementContext | null = null;
    try {
      context = await this.engagementRead.findContextByToken(validToken);
    } catch (err) {
      this.logger.debug("TrackEmailClickUseCase: failed to resolve engagement context", {
        token: validToken,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // 4. Record click and mirror stats onto the Activity (both best-effort)
    const now = new Date();
    try {
      await this.emailTrackingRepo.recordClick(validToken, redirectUrl, userAgent, ip);
    } catch (err) {
      this.logger.warn("TrackEmailClickUseCase: failed to record click", {
        token: validToken,
        url: redirectUrl,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    try {
      await this.activitiesRepo.updateEmailClickStats(validToken, now);
    } catch (err) {
      this.logger.warn("TrackEmailClickUseCase: failed to update activity click stats", {
        token: validToken,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // 5. Notify the owner on every click of a NON-campaign email (campaigns
    //    excluded to avoid noise). Never let this break the redirect.
    if (context && !context.isCampaign) {
      await notifyEmailEngagement(this.createNotification, context, "clicked", this.logger, redirectUrl);
    }

    return right({ redirectUrl });
  }
}
