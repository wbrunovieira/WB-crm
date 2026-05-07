import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "@/infra/database/prisma.service";
import { ProcessCallRecordingUseCase } from "@/domain/integrations/goto/application/use-cases/process-call-recording.use-case";
import { PollCallTranscriptionsUseCase } from "@/domain/integrations/goto/application/use-cases/poll-call-transcriptions.use-case";
import { RefreshCallRecordingIdsUseCase } from "@/domain/integrations/goto/application/use-cases/refresh-call-recording-ids.use-case";

@Injectable()
export class GoToRecordingCronService {
  private readonly logger = new Logger(GoToRecordingCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly processRecording: ProcessCallRecordingUseCase,
    private readonly pollTranscriptions: PollCallTranscriptionsUseCase,
    private readonly refreshRecordingIds: RefreshCallRecordingIdsUseCase,
  ) {}

  @Cron("0 * * * *")
  async processRecordings(): Promise<void> {
    this.logger.log("GoTo recording cron: starting");

    const now = new Date();
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    try {
      // Pass 0: Fill in missing gotoRecordingId for answered calls (sync path gap)
      const pass0 = await this.refreshRecordingIds.execute({ sinceDaysAgo: 2 });
      if (pass0.isRight()) {
        this.logger.log(`GoTo recording cron Pass 0: refreshed=${pass0.value.refreshed} skipped=${pass0.value.skipped}`);
      }

      // Pass 1: Find activities pending S3 download (with recordingId or at least callId for fallback)
      const pendingDownload = await this.prisma.activity.findMany({
        where: {
          OR: [
            { gotoRecordingId: { not: null } },
            { gotoCallId: { not: null } },
          ],
          gotoRecordingUrl: null,
          completedAt: { gte: since7d },
        },
        select: { id: true },
      });

      this.logger.log(`GoTo recording cron: ${pendingDownload.length} activities need S3 download`);

      for (const activity of pendingDownload) {
        try {
          await this.processRecording.execute({ activityId: activity.id });
        } catch (err) {
          this.logger.error(`Error processing recording for activity ${activity.id}`, {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // Pass 2: Poll pending transcription jobs
      const pendingJobs = await this.prisma.activity.findMany({
        where: {
          gotoTranscriptText: null,
          OR: [
            { gotoTranscriptionJobId: { not: null } },
            { gotoTranscriptionJobId2: { not: null } },
          ],
        },
        select: { id: true },
      });

      this.logger.log(`GoTo recording cron: ${pendingJobs.length} activities have pending transcription jobs`);

      for (const activity of pendingJobs) {
        try {
          await this.pollTranscriptions.execute({ activityId: activity.id });
        } catch (err) {
          this.logger.error(`Error polling transcription for activity ${activity.id}`, {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    } catch (err) {
      this.logger.error("GoTo recording cron: fatal error", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    this.logger.log("GoTo recording cron: done");
  }
}
