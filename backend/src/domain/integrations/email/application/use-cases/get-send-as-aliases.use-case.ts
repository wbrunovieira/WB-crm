import { Injectable, Logger } from "@nestjs/common";
import { Either, right, left } from "@/core/either";
import { GmailPort, SendAsAlias } from "../ports/gmail.port";

export interface GetSendAsAliasesOutput {
  aliases: SendAsAlias[];
}

@Injectable()
export class GetSendAsAliasesUseCase {
  private readonly logger = new Logger(GetSendAsAliasesUseCase.name);

  constructor(private readonly gmailPort: GmailPort) {}

  async execute(userId: string): Promise<Either<Error, GetSendAsAliasesOutput>> {
    try {
      const aliases = await this.gmailPort.getSendAsAliases(userId);
      return right({ aliases });
    } catch (err) {
      this.logger.error("GetSendAsAliasesUseCase: error", {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
      return left(err instanceof Error ? err : new Error(String(err)));
    }
  }
}
