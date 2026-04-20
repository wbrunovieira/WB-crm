import { Injectable, Logger } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { GmailPort } from "../ports/gmail.port";
import { GoogleOAuthPort } from "../ports/google-oauth.port";
import { EmailMessagesRepository, EmailMessage } from "../repositories/email-messages.repository";
import { EmailTrackingRepository, EmailTrackingRecord } from "../repositories/email-tracking.repository";
import { EmailAddress } from "../../enterprise/value-objects/email-address.vo";

export interface SendEmailInput {
  userId: string;
  to: string;
  subject: string;
  bodyHtml: string;
  threadId?: string;
  ownerId: string;
}

export interface SendEmailOutput {
  messageId: string;
  threadId: string;
}

/** Generates a URL-safe random token without external dependencies */
function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function injectTracking(html: string, token: string, baseUrl: string): string {
  const pixelUrl = `${baseUrl}/track/open/${token}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`;

  // Wrap links for click tracking
  const trackedHtml = html.replace(
    /<a\s+([^>]*?)href="(https?:\/\/[^"]+)"([^>]*?)>/gi,
    (_match, before, url, after) => {
      const encodedUrl = encodeURIComponent(url);
      const trackUrl = `${baseUrl}/track/click/${token}?url=${encodedUrl}`;
      return `<a ${before}href="${trackUrl}"${after}>`;
    },
  );

  // Append pixel before closing body tag, or at the end
  if (trackedHtml.includes("</body>")) {
    return trackedHtml.replace("</body>", `${pixel}</body>`);
  }

  return trackedHtml + pixel;
}

@Injectable()
export class SendEmailUseCase {
  private readonly logger = new Logger(SendEmailUseCase.name);

  constructor(
    private readonly gmailPort: GmailPort,
    private readonly oauthPort: GoogleOAuthPort,
    private readonly emailMessagesRepo: EmailMessagesRepository,
    private readonly emailTrackingRepo: EmailTrackingRepository,
  ) {}

  async execute(input: SendEmailInput): Promise<Either<Error, SendEmailOutput>> {
    const { userId, to, subject, bodyHtml, threadId, ownerId } = input;

    // 1. Validate email address
    const emailResult = EmailAddress.create(to);
    if (emailResult.isLeft()) {
      return left(emailResult.value);
    }
    const validatedEmail = emailResult.value.value;

    // 2. Get valid OAuth token
    let _accessToken: string;
    try {
      _accessToken = await this.oauthPort.getValidToken(userId);
    } catch (err) {
      this.logger.error("SendEmailUseCase: failed to get OAuth token", {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
      return left(err instanceof Error ? err : new Error("Failed to get OAuth token"));
    }

    // 3. Generate tracking token and inject tracking
    const trackingToken = generateToken();
    const baseUrl = process.env.BACKEND_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const trackedHtml = injectTracking(bodyHtml, trackingToken, baseUrl);

    // 4. Send email
    let messageId: string;
    let resultThreadId: string;

    try {
      const sendResult = await this.gmailPort.send({
        userId,
        to: validatedEmail,
        subject,
        bodyHtml: trackedHtml,
        threadId,
      });
      messageId = sendResult.messageId;
      resultThreadId = sendResult.threadId;
    } catch (err) {
      this.logger.error("SendEmailUseCase: failed to send email", {
        to,
        error: err instanceof Error ? err.message : String(err),
      });
      return left(err instanceof Error ? err : new Error("Failed to send email"));
    }

    // 5. Save EmailMessage record
    const now = new Date();
    const emailRecord: EmailMessage = {
      id: `em-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      gmailMessageId: messageId,
      threadId: resultThreadId,
      from: userId, // user's email (will be resolved from profile in production)
      to: validatedEmail,
      subject,
      ownerId,
      sentAt: now,
      trackingToken,
      openCount: 0,
      clickCount: 0,
    };

    try {
      await this.emailMessagesRepo.save(emailRecord);
    } catch (err) {
      this.logger.warn("SendEmailUseCase: failed to save EmailMessage record", {
        messageId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // 6. Save EmailTracking record for open tracking
    const trackingRecord: EmailTrackingRecord = {
      id: `et-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      token: trackingToken,
      type: "open",
      emailMessageId: emailRecord.id,
      ownerId,
    };

    try {
      await this.emailTrackingRepo.save(trackingRecord);
    } catch (err) {
      this.logger.warn("SendEmailUseCase: failed to save EmailTracking record", {
        token: trackingToken,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return right({ messageId, threadId: resultThreadId });
  }
}
