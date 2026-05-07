import { Injectable, Logger } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";
import { GoToApiPort } from "../ports/goto-api.port";
import { GoToTokenPort } from "../ports/goto-token.port";

export interface RefreshCallRecordingIdsInput {
  sinceDaysAgo: number;
}

export interface RefreshCallRecordingIdsOutput {
  refreshed: number;
  skipped: number;
}

@Injectable()
export class RefreshCallRecordingIdsUseCase {
  private readonly logger = new Logger(RefreshCallRecordingIdsUseCase.name);

  constructor(
    private readonly activitiesRepository: ActivitiesRepository,
    private readonly goToApi: GoToApiPort,
    private readonly goToToken: GoToTokenPort,
  ) {}

  async execute(
    input: RefreshCallRecordingIdsInput,
  ): Promise<Either<never, RefreshCallRecordingIdsOutput>> {
    const since = new Date(Date.now() - input.sinceDaysAgo * 24 * 60 * 60 * 1000);

    const candidates = await this.activitiesRepository.findAnsweredCallsMissingRecordingId(since);

    if (candidates.length === 0) {
      return right({ refreshed: 0, skipped: 0 });
    }

    const token = await this.goToToken.getValidAccessToken();

    let refreshed = 0;
    let skipped = 0;

    for (const activity of candidates) {
      try {
        const report = await this.goToApi.fetchCallReport(activity.gotoCallId!, token);
        const recordingId = report?.participants
          .flatMap((p) => p.recordings ?? [])
          .find((r) => r.id)?.id ?? null;

        if (recordingId) {
          activity.update({ gotoRecordingId: recordingId });
          await this.activitiesRepository.save(activity);
          this.logger.log(`Recording ID refreshed: activity=${activity.id} recordingId=${recordingId}`);
          refreshed++;
        } else {
          skipped++;
        }
      } catch (err) {
        this.logger.error(`Failed to refresh recording ID for activity ${activity.id}`, {
          error: err instanceof Error ? err.message : String(err),
        });
        skipped++;
      }
    }

    return right({ refreshed, skipped });
  }
}
