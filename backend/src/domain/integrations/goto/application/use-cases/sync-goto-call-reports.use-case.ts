import { Injectable, Logger } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { GoToApiPort } from "../ports/goto-api.port";
import { GoToTokenPort } from "../ports/goto-token.port";
import { CreateCallActivityUseCase } from "./create-call-activity.use-case";

export interface SyncGotoCallReportsInput {
  ownerId: string;
  sinceDaysAgo?: number;
}

export interface SyncGotoCallReportsOutput {
  fetched: number;
  created: number;
  skipped: number;
}

@Injectable()
export class SyncGotoCallReportsUseCase {
  private readonly logger = new Logger(SyncGotoCallReportsUseCase.name);

  constructor(
    private readonly goToApi: GoToApiPort,
    private readonly goToToken: GoToTokenPort,
    private readonly createCallActivity: CreateCallActivityUseCase,
  ) {}

  async execute(input: SyncGotoCallReportsInput): Promise<Either<never, SyncGotoCallReportsOutput>> {
    const { ownerId, sinceDaysAgo = 1 } = input;

    const accessToken = await this.goToToken.getValidAccessToken();
    const since = new Date(Date.now() - sinceDaysAgo * 24 * 60 * 60 * 1000).toISOString();

    this.logger.log("Syncing GoTo call reports", { since, ownerId });

    const reports = await this.goToApi.fetchReportsSince(accessToken, since);

    let created = 0;
    let skipped = 0;

    for (const report of reports) {
      try {
        const result = await this.createCallActivity.execute({ report, ownerId });
        if (result.isRight()) {
          if (result.value.alreadyExists) skipped++;
          else created++;
        } else {
          skipped++;
        }
      } catch {
        skipped++;
      }
    }

    this.logger.log("GoTo sync done", { fetched: reports.length, created, skipped });
    return right({ fetched: reports.length, created, skipped });
  }
}
