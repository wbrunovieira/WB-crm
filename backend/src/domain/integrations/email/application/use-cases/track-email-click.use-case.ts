import { Injectable, Logger } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { EmailTrackingRepository } from "../repositories/email-tracking.repository";
import { EmailTrackingToken } from "../../enterprise/value-objects/email-tracking-token.vo";

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

    // 3. Record click (best-effort — clicks always count)
    try {
      await this.emailTrackingRepo.recordClick(validToken, redirectUrl, userAgent, ip);
    } catch (err) {
      this.logger.warn("TrackEmailClickUseCase: failed to record click", {
        token: validToken,
        url: redirectUrl,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return right({ redirectUrl });
  }
}
