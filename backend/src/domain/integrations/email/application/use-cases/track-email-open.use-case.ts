import { Injectable, Logger } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { EmailTrackingRepository } from "../repositories/email-tracking.repository";
import { EmailTrackingToken } from "../../enterprise/value-objects/email-tracking-token.vo";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";
import { EmailEngagementReadPort, EmailEngagementContext } from "../ports/email-engagement-read.port";
import { CreateNotificationUseCase } from "@/domain/notifications/application/use-cases/notifications.use-cases";
import { notifyEmailEngagement } from "./email-engagement-notifier";

export interface TrackEmailOpenInput {
  token: string;
  userAgent?: string;
  ip?: string;
}

export interface TrackEmailOpenOutput {
  tracked: boolean;
}

// Known bot/proxy patterns to filter out
const BOT_PATTERNS = [
  "bot",
  "crawler",
  "spider",
  "googlebot",
  "adsbot",
  "preview",
  "validator",
  "proxy",
  "applebot",
  "apple-icloud",
  "apple mail privacy",
  "icloud",
  "googleimageproxy",
];

@Injectable()
export class TrackEmailOpenUseCase {
  private readonly logger = new Logger(TrackEmailOpenUseCase.name);

  constructor(
    private readonly emailTrackingRepo: EmailTrackingRepository,
    private readonly activitiesRepo: ActivitiesRepository,
    private readonly engagementRead: EmailEngagementReadPort,
    private readonly createNotification: CreateNotificationUseCase,
  ) {}

  async execute(input: TrackEmailOpenInput): Promise<Either<Error, TrackEmailOpenOutput>> {
    const { token, userAgent = "", ip } = input;

    // 1. Validate token format
    const tokenResult = EmailTrackingToken.create(token);
    if (tokenResult.isLeft()) {
      return left(tokenResult.value);
    }
    const validToken = tokenResult.value.value;

    // 2. Find tracking record
    const record = await this.emailTrackingRepo.findByToken(validToken);
    if (!record) {
      // Return right(tracked: false) — don't leak info via 404
      this.logger.debug("TrackEmailOpenUseCase: token not found", { token: validToken });
      return right({ tracked: false });
    }

    // 3. Bot/proxy filter
    const ua = userAgent.toLowerCase();
    const isBot = BOT_PATTERNS.some((pattern) => ua.includes(pattern));

    if (isBot) {
      this.logger.debug("TrackEmailOpenUseCase: bot filtered", { userAgent, token: validToken });
      return right({ tracked: false });
    }

    // 4. Resolve engagement context (owner, recipient, campaign flag). Best-effort.
    let context: EmailEngagementContext | null = null;
    try {
      context = await this.engagementRead.findContextByToken(validToken);
    } catch (err) {
      this.logger.debug("TrackEmailOpenUseCase: failed to resolve engagement context", {
        token: validToken,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // 5. Record open and mirror stats onto the Activity
    const now = new Date();
    try {
      await this.emailTrackingRepo.recordOpen(validToken, userAgent, ip);
    } catch (err) {
      this.logger.warn("TrackEmailOpenUseCase: failed to record open", {
        token: validToken,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    try {
      await this.activitiesRepo.updateEmailOpenStats(validToken, now);
    } catch (err) {
      this.logger.warn("TrackEmailOpenUseCase: failed to update activity open stats", {
        token: validToken,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // 6. Notify the owner on every open of a NON-campaign email (campaigns are
    //    excluded to avoid notification noise). Never let this break tracking.
    if (context && !context.isCampaign) {
      await notifyEmailEngagement(this.createNotification, context, "opened", this.logger);
    }

    return right({ tracked: true });
  }
}
