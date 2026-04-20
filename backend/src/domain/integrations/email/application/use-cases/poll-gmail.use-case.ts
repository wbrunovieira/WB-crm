import { Injectable, Logger } from "@nestjs/common";
import { Either, right, left } from "@/core/either";
import { GmailPort } from "../ports/gmail.port";
import { ProcessIncomingEmailUseCase } from "./process-incoming-email.use-case";
import { PrismaService } from "@/infra/database/prisma.service";

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
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: PollGmailInput): Promise<Either<Error, PollGmailOutput>> {
    const { userId, ownerId } = input;

    try {
      // 1. Get current historyId from GoogleToken
      const googleToken = await this.prisma.googleToken.findFirst({
        where: { id: userId },
        select: { gmailHistoryId: true },
      });

      let historyId: string;

      if (!googleToken?.gmailHistoryId) {
        // Fetch profile to get initial historyId
        const profile = await this.gmailPort.getProfile(userId);
        historyId = profile.historyId;

        // Store initial historyId
        await this.prisma.googleToken.updateMany({
          where: { id: userId },
          data: { gmailHistoryId: historyId },
        });

        // No messages to process on first run
        return right({ processed: 0 });
      }

      historyId = googleToken.gmailHistoryId;

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

      // 4. Update historyId to the latest one
      if (messages.length > 0) {
        const profile = await this.gmailPort.getProfile(userId);
        await this.prisma.googleToken.updateMany({
          where: { id: userId },
          data: { gmailHistoryId: profile.historyId },
        });
      }

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
