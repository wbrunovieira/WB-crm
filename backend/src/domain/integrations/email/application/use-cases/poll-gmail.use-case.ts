import { Injectable, Logger } from "@nestjs/common";
import { Either, right, left } from "@/core/either";
import { GmailPort } from "../ports/gmail.port";
import { ProcessIncomingEmailUseCase } from "./process-incoming-email.use-case";
import { GoogleTokenRepository } from "../repositories/google-token.repository";

export interface PollGmailInput {
  userId: string;
  ownerId: string;
}

export interface PollGmailOutput {
  processed: number;
}

@Injectable()
export class PollGmailUseCase {
  private readonly logger = new Logger(PollGmailUseCase.name);

  constructor(
    private readonly gmailPort: GmailPort,
    private readonly processIncomingEmail: ProcessIncomingEmailUseCase,
    private readonly googleToken: GoogleTokenRepository,
  ) {}

  async execute(input: PollGmailInput): Promise<Either<Error, PollGmailOutput>> {
    const { userId, ownerId } = input;

    try {
      // 1. Get current historyId from the (singleton) GoogleToken
      const token = await this.googleToken.findFirst();

      let historyId: string;

      if (!token?.gmailHistoryId) {
        // Fetch profile to get initial historyId
        const profile = await this.gmailPort.getProfile(userId);
        historyId = profile.historyId;

        // Store initial historyId
        await this.googleToken.updateHistoryId(historyId);

        // No messages to process on first run
        return right({ processed: 0 });
      }

      historyId = token.gmailHistoryId;

      // 2. Poll for new messages
      const messages = await this.gmailPort.pollHistory(userId, historyId);

      let processed = 0;

      // 3. Process each new message
      for (const message of messages) {
        const result = await this.processIncomingEmail.execute(message, ownerId);

        if (result.isRight() && !result.value.skipped) {
          processed++;
        }
      }

      // 4. Always advance historyId so expired/stale IDs don't get stuck
      const profile = await this.gmailPort.getProfile(userId);
      await this.googleToken.updateHistoryId(profile.historyId);

      return right({ processed });
    } catch (err) {
      this.logger.error("PollGmailUseCase: error", {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
      return left(err instanceof Error ? err : new Error(String(err)));
    }
  }
}
