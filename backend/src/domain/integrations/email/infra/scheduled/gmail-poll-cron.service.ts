import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PollGmailUseCase } from "../../application/use-cases/poll-gmail.use-case";
import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class GmailPollCronService {
  private readonly logger = new Logger(GmailPollCronService.name);

  constructor(
    private readonly pollGmail: PollGmailUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Cron("*/5 * * * *")
  async pollAllUsers(): Promise<void> {
    this.logger.log("Gmail poll cron: starting");

    try {
      // Find all users with Google tokens
      const tokens = await this.prisma.googleToken.findMany({
        select: { id: true },
      });

      this.logger.log(`Gmail poll cron: polling ${tokens.length} users`);

      let totalProcessed = 0;

      for (const token of tokens) {
        try {
          const result = await this.pollGmail.execute({
            userId: token.id,
            ownerId: token.id,
          });

          if (result.isRight()) {
            totalProcessed += result.value.processed;
          } else {
            this.logger.warn("Gmail poll cron: user poll failed", {
              userId: token.id,
              error: result.value.message,
            });
          }
        } catch (err) {
          this.logger.warn("Gmail poll cron: unexpected error for user", {
            userId: token.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      this.logger.log(`Gmail poll cron: done, processed=${totalProcessed}`);
    } catch (err) {
      this.logger.error("Gmail poll cron: fatal error", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
